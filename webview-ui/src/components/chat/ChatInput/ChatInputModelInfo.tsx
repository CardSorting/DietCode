import { useMemo } from "react";
import styled from "styled-components";
import {
  getModeSpecificFields,
  normalizeApiConfiguration,
} from "@/components/settings/utils/providerUtils";
import type { Mode } from "@shared/storage/types.ts";

const ModelContainer = styled.div`
	position: relative;
	display: flex;
	flex: 1;
	min-width: 0;
`;

const ModelButtonWrapper = styled.div`
	display: inline-flex;
	min-width: 0;
	max-width: 100%;
`;

const ModelDisplayButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !["isActive", "disabled"].includes(prop),
})<{ isActive?: boolean; disabled?: boolean }>`
	background: transparent;
	border: none;
	padding: 0px 0px;
	height: 20px;
	width: 100%;
	min-width: 0;
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	text-decoration: ${(props) => (props.isActive ? "underline" : "none")};
	color: ${(props) => (props.isActive ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)")};
	display: flex;
	align-items: center;
	font-size: 10px;
	outline: none;
	user-select: none;
	opacity: ${(props) => (props.disabled ? 0.5 : 1)};
	pointer-events: ${(props) => (props.disabled ? "none" : "auto")};

	&:hover,
	&:focus {
		color: ${(props) => (props.disabled ? "var(--vscode-descriptionForeground)" : "var(--vscode-foreground)")};
		text-decoration: ${(props) => (props.disabled ? "none" : "underline")};
		outline: none;
	}

	&:focus-visible {
		outline: none;
	}
`;

const ModelButtonContent = styled.div`
	width: 100%;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

interface ChatInputModelInfoProps {
  apiConfiguration: any;
  mode: Mode;
  onClick: () => void;
  disabled?: boolean;
}

export const ChatInputModelInfo: React.FC<ChatInputModelInfoProps> = ({
  apiConfiguration,
  mode,
  onClick,
  disabled,
}) => {
  const modelDisplayName = useMemo(() => {
    const { selectedProvider, selectedModelId } = normalizeApiConfiguration(
      apiConfiguration,
      mode,
    );
    const {
      vsCodeLmModelSelector,
      togetherModelId,
      lmStudioModelId,
      ollamaModelId,
      liteLlmModelId,
      requestyModelId,
      vercelAiGatewayModelId,
    } = getModeSpecificFields(apiConfiguration, mode);
    const unknownModel = "unknown";

    if (!apiConfiguration) return unknownModel;

    switch (selectedProvider) {
      case "cline":
        return `${selectedProvider}:${selectedModelId}`;
      case "openai":
        return `openai-compat:${selectedModelId}`;
      case "vscode-lm":
        return `vscode-lm:${vsCodeLmModelSelector ? `${vsCodeLmModelSelector.vendor ?? ""}/${vsCodeLmModelSelector.family ?? ""}` : unknownModel}`;
      case "together":
        return `${selectedProvider}:${togetherModelId}`;
      case "lmstudio":
        return `${selectedProvider}:${lmStudioModelId}`;
      case "ollama":
        return `${selectedProvider}:${ollamaModelId}`;
      case "litellm":
        return `${selectedProvider}:${liteLlmModelId}`;
      case "requesty":
        return `${selectedProvider}:${requestyModelId}`;
      case "vercel-ai-gateway":
        return `${selectedProvider}:${vercelAiGatewayModelId || selectedModelId}`;
      default:
        return `${selectedProvider}:${selectedModelId}`;
    }
  }, [apiConfiguration, mode]);

  return (
    <ModelContainer>
      <ModelButtonWrapper>
        <ModelDisplayButton
          disabled={disabled}
          onClick={onClick}
          title="Open API Settings"
        >
          <ModelButtonContent className="text-xs">
            {modelDisplayName}
          </ModelButtonContent>
        </ModelDisplayButton>
      </ModelButtonWrapper>
    </ModelContainer>
  );
};
