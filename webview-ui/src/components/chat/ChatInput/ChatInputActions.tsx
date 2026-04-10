import { cn } from "@/lib/utils";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { AtSignIcon, PlusIcon } from "lucide-react";
import styled from "styled-components";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ClineRulesToggleModal from "../cline-rules/ClineRulesToggleModal";
import ServersToggleModal from "./ServersToggleModal";

const ButtonGroup = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	flex: 1;
	min-width: 0;
`;

const ButtonContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 3px;
	font-size: 10px;
	white-space: nowrap;
	min-width: 0;
	width: 100%;
`;

interface ChatInputActionsProps {
  sendingDisabled: boolean;
  onSend: () => void;
  shouldDisableFilesAndImages: boolean;
  onSelectFilesAndImages: () => void;
  onMentionClick: () => void;
  textAreaBaseHeight?: number;
  children?: React.ReactNode;
}

export const ChatInputActions: React.FC<ChatInputActionsProps> = ({
  sendingDisabled,
  onSend,
  shouldDisableFilesAndImages,
  onSelectFilesAndImages,
  onMentionClick,
  textAreaBaseHeight,
  children,
}) => {
  return (
    <div
      className="absolute flex items-end bottom-4.5 right-5 z-10 h-8 text-xs"
      style={{ height: textAreaBaseHeight }}
    >
      <div className="flex flex-row items-center">
        <button
          className={cn(
            "input-icon-button",
            { disabled: sendingDisabled },
            "codicon codicon-send text-sm",
          )}
          data-testid="send-button"
          disabled={sendingDisabled}
          onClick={onSend}
        />

        <ButtonGroup className="ml-2.5">
          <Tooltip>
            <TooltipContent>Add context with @mention</TooltipContent>
            <TooltipTrigger>
              <VSCodeButton
                appearance="icon"
                aria-label="Add context with @mention"
                className="p-0 m-0 flex items-center"
                onClick={onMentionClick}
              >
                <ButtonContainer>
                  <AtSignIcon size={13} />
                </ButtonContainer>
              </VSCodeButton>
            </TooltipTrigger>
          </Tooltip>

          <Tooltip>
            <TooltipContent>Add Files & Images</TooltipContent>
            <TooltipTrigger>
              <VSCodeButton
                appearance="icon"
                aria-label="Add Files & Images"
                className="p-0 m-0 flex items-center"
                data-testid="files-button"
                disabled={shouldDisableFilesAndImages}
                onClick={() => {
                  if (!shouldDisableFilesAndImages) {
                    onSelectFilesAndImages();
                  }
                }}
              >
                <ButtonContainer>
                  <PlusIcon size={13} />
                </ButtonContainer>
              </VSCodeButton>
            </TooltipTrigger>
          </Tooltip>

          <ServersToggleModal />
          <ClineRulesToggleModal />
          
          {children}
        </ButtonGroup>
      </div>
    </div>
  );
};
