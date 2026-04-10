import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLATFORM_CONFIG, PlatformType } from "@/config/platform.config";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { ModelsServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import PROVIDERS from "@shared/providers/providers.json";
import type { Mode } from "@shared/storage/types.ts";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import Fuse from "fuse.js";
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "react-use";
import styled from "styled-components";
import { StandardProviderLayout } from "./common/StandardProviderLayout";
import { OllamaProvider } from "./providers/OllamaProvider";
import { OpenAICompatibleProvider } from "./providers/OpenAICompatible";
import { VSCodeLmProvider } from "./providers/VSCodeLmProvider";
import {
  anthropicModels,
  geminiModels,
  openAiNativeModels,
} from "@shared/api.ts";
import ClineModelPicker from "./ClineModelPicker";
import {
  filterOpenRouterModelIds,
  useApiConfigurationHandlers,
} from "./utils/providerUtils";
import FuzzyModelPicker from "./common/FuzzyModelPicker";

interface ApiOptionsProps {
  showModelOptions: boolean;
  apiErrorMessage?: string;
  modelIdErrorMessage?: string;
  isPopup?: boolean;
  currentMode: Mode;
  initialModelTab?: "recommended" | "free";
}

// This is necessary to ensure dropdown opens downward, important for when this is used in popup
export const OPENROUTER_MODEL_PICKER_Z_INDEX = 1000;
export const DROPDOWN_Z_INDEX = OPENROUTER_MODEL_PICKER_Z_INDEX + 2; // Higher than the OpenRouterModelPicker's and ModelSelectorTooltip's z-index

export const DropdownContainer = styled.div<{ zIndex?: number }>`
	position: relative;
	z-index: ${(props) => props.zIndex || DROPDOWN_Z_INDEX};

	// Force dropdowns to open downward
	& vscode-dropdown::part(listbox) {
		position: absolute !important;
		top: 100% !important;
		bottom: auto !important;
	}
`;

const ApiOptions = memo(({
  showModelOptions,
  apiErrorMessage,
  modelIdErrorMessage,
  isPopup,
  currentMode,
  initialModelTab,
}: ApiOptionsProps) => {
  const { apiConfiguration, remoteConfigSettings, openRouterModels, favoritedModelIds } = useExtensionState();
  const { selectedProvider, selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode);
  const { handleModeFieldChange, handleFieldChange } = useApiConfigurationHandlers();

  // Polling for Ollama models
  const [_ollamaModels, setOllamaModels] = useState<string[]>([]);
  const requestLocalModels = useCallback(async () => {
    if (selectedProvider === "ollama") {
      try {
        const response = await ModelsServiceClient.getOllamaModels(
          StringRequest.create({ value: apiConfiguration?.ollamaBaseUrl || "" }),
        );
        if (response?.values) setOllamaModels(response.values);
      } catch (error) {
        console.error("Failed to fetch Ollama models:", error);
        setOllamaModels([]);
      }
    }
  }, [selectedProvider, apiConfiguration?.ollamaBaseUrl]);

  useEffect(() => {
    if (selectedProvider === "ollama") requestLocalModels();
  }, [selectedProvider, requestLocalModels]);
  useInterval(requestLocalModels, selectedProvider === "ollama" ? 2000 : null);

  // Provider search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownListRef = useRef<HTMLDivElement>(null);

  const providerOptions = useMemo(() => {
    let providers = PROVIDERS.list;
    if (PLATFORM_CONFIG.type !== PlatformType.VSCODE) {
      providers = providers.filter((option) => option.value !== "vscode-lm");
    }
    const remoteProviders = remoteConfigSettings?.remoteConfiguredProviders || [];
    if (remoteProviders.length > 0) {
      providers = providers.filter((option) => remoteProviders.includes(option.value));
    }
    return providers;
  }, [remoteConfigSettings]);

  const currentProviderLabel = useMemo(() => {
    return providerOptions.find((option) => option.value === selectedProvider)?.label || selectedProvider;
  }, [providerOptions, selectedProvider]);

  useEffect(() => {
    if (!isDropdownVisible) setSearchTerm(currentProviderLabel);
  }, [currentProviderLabel, isDropdownVisible]);

  const searchableItems = useMemo(() => providerOptions.map((option) => ({ value: option.value, html: option.label })), [providerOptions]);
  const fuse = useMemo(() => new Fuse(searchableItems, { keys: ["html"], threshold: 0.3, shouldSort: true }), [searchableItems]);
  const providerSearchResults = useMemo(() => searchTerm && searchTerm !== currentProviderLabel ? fuse.search(searchTerm)?.map((r) => r.item) : searchableItems, [searchableItems, searchTerm, fuse, currentProviderLabel]);

  const handleProviderChange = (newProvider: string) => {
    handleModeFieldChange({ plan: "planModeApiProvider", act: "actModeApiProvider" }, newProvider as any, currentMode);
    setIsDropdownVisible(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownVisible) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex((prev) => (prev < providerSearchResults.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < providerSearchResults.length) handleProviderChange(providerSearchResults[selectedIndex].value);
        break;
      case "Escape":
        setIsDropdownVisible(false);
        setSelectedIndex(-1);
        setSearchTerm(currentProviderLabel);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
        setSearchTerm(currentProviderLabel);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentProviderLabel]);

  useEffect(() => {
    setSelectedIndex(-1);
    if (dropdownListRef.current) dropdownListRef.current.scrollTop = 0;
  }, [searchTerm]);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const commonProps = {
    isPopup,
    currentMode,
    showModelOptions,
    selectedModelId,
    selectedModelInfo,
    onModelChange: (v: string) => handleModeFieldChange({ plan: "planModeApiModelId", act: "actModeApiModelId" }, v, currentMode),
  };

  const openRouterModelIds = useMemo(() => {
    const unfiltered = Object.keys(openRouterModels || {}).sort();
    return filterOpenRouterModelIds(unfiltered, "openrouter");
  }, [openRouterModels]);

  const handleOpenRouterModelChange = (newModelId: string) => {
    handleModeFieldChange(
      {
        openRouterModelId: { plan: "planModeOpenRouterModelId", act: "actModeOpenRouterModelId" },
        openRouterModelInfo: { plan: "planModeOpenRouterModelInfo", act: "actModeOpenRouterModelInfo" },
      },
      {
        openRouterModelId: newModelId,
        openRouterModelInfo: openRouterModels[newModelId],
      },
      currentMode,
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: isPopup ? -10 : 0 }}>
      {/* Provider Selector */}
      <DropdownContainer className="dropdown-container">
        <label htmlFor="api-provider">
          <span style={{ fontWeight: 500 }}>API Provider</span>
          {remoteConfigSettings?.remoteConfiguredProviders && remoteConfigSettings.remoteConfiguredProviders.length > 0 && (
            <Tooltip>
              <TooltipTrigger><i className="codicon codicon-lock text-description text-sm ml-1" /></TooltipTrigger>
              <TooltipContent>Managed by organization's remote configuration</TooltipContent>
            </Tooltip>
          )}
        </label>
        <ProviderDropdownWrapper ref={dropdownRef}>
          <VSCodeTextField
            id="api-provider"
            onFocus={() => { setIsDropdownVisible(true); setSearchTerm(""); }}
            onInput={(e) => { setSearchTerm((e.target as HTMLInputElement)?.value || ""); setIsDropdownVisible(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search provider..."
            style={{ width: "100%", zIndex: DROPDOWN_Z_INDEX, position: "relative", minWidth: 130 }}
            value={searchTerm}
          />
          {isDropdownVisible && (
            <ProviderDropdownList ref={dropdownListRef} role="listbox">
              {providerSearchResults.map((item, index) => (
                <ProviderDropdownItem key={item.value} isSelected={index === selectedIndex} onClick={() => handleProviderChange(item.value)} onMouseEnter={() => setSelectedIndex(index)} ref={(el) => { itemRefs.current[index] = el; }} role="option">
                  <span>{item.html}</span>
                </ProviderDropdownItem>
              ))}
            </ProviderDropdownList>
          )}
        </ProviderDropdownWrapper>
      </DropdownContainer>

      {/* Provider Settings */}
      {apiConfiguration && (
        <>
          {selectedProvider === "cline" && (
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.apiKey || ""}
              baseUrl={apiConfiguration.openAiBaseUrl}
              baseUrlPlaceholder="Default: https://api.openai.com/v1"
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeApiKey", act: "actModeApiKey" } as any, v, currentMode)}
              onBaseUrlChange={(v) => handleModeFieldChange({ plan: "planModeOpenAiBaseUrl", act: "actModeOpenAiBaseUrl" } as any, v, currentMode)}
              providerName="Cline"
            >
              <ClineModelPicker currentMode={currentMode} initialTab={initialModelTab} isPopup={isPopup} />
            </StandardProviderLayout>
          )}

          {selectedProvider === "anthropic" && (
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.apiKey || ""}
              baseUrl={apiConfiguration.anthropicBaseUrl}
              baseUrlPlaceholder="Default: https://api.anthropic.com"
              models={anthropicModels}
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeApiKey", act: "actModeApiKey" } as any, v, currentMode)}
              onBaseUrlChange={(v) => handleModeFieldChange({ plan: "planModeAnthropicBaseUrl", act: "actModeAnthropicBaseUrl" } as any, v, currentMode)}
              providerName="Anthropic"
              remoteBaseUrl={remoteConfigSettings?.anthropicBaseUrl}
              signupUrl="https://console.anthropic.com/settings/keys"
            />
          )}

          {selectedProvider === "openai-native" && (
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.openAiNativeApiKey || ""}
              models={openAiNativeModels}
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeOpenAiNativeApiKey", act: "actModeOpenAiNativeApiKey" } as any, v, currentMode)}
              providerName="OpenAI"
              signupUrl="https://platform.openai.com/api-keys"
            />
          )}

          {selectedProvider === "openrouter" && (
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.openRouterApiKey || ""}
              baseUrl={apiConfiguration.openRouterBaseUrl}
              baseUrlPlaceholder="Default: https://openrouter.ai/api/v1"
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeOpenRouterApiKey", act: "actModeOpenRouterApiKey" } as any, v, currentMode)}
              onBaseUrlChange={(v) => handleModeFieldChange({ plan: "planModeOpenRouterBaseUrl", act: "actModeOpenRouterBaseUrl" } as any, v, currentMode)}
              providerName="OpenRouter"
              signupUrl="https://openrouter.ai/keys"
              onProviderSortingChange={(v) => handleFieldChange("openRouterProviderSorting", v)}
              providerSorting={apiConfiguration?.openRouterProviderSorting}
            >
              <FuzzyModelPicker
                favoritedModelIds={favoritedModelIds}
                modelIds={openRouterModelIds}
                onModelChange={handleOpenRouterModelChange}
                selectedModelId={selectedModelId}
              />
              <p style={{ fontSize: "12px", marginTop: 10, color: "var(--vscode-descriptionForeground)" }}>
                Latest models on <VSCodeLink href="https://openrouter.ai/models" style={{ display: "inline", fontSize: "inherit" }}>OpenRouter.</VSCodeLink>
                Try <VSCodeLink onClick={() => handleOpenRouterModelChange("anthropic/claude-sonnet-4.6")} style={{ display: "inline", fontSize: "inherit" }}>anthropic/claude-sonnet-4.6.</VSCodeLink>
              </p>
            </StandardProviderLayout>
          )}

          {selectedProvider === "openai" && <OpenAICompatibleProvider currentMode={currentMode} isPopup={isPopup} showModelOptions={showModelOptions} />}

          {selectedProvider === "gemini" && (
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.geminiApiKey || ""}
              baseUrl={apiConfiguration.geminiBaseUrl}
              baseUrlPlaceholder="Default: https://generativelanguage.googleapis.com"
              models={geminiModels}
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeGeminiApiKey", act: "actModeGeminiApiKey" } as any, v, currentMode)}
              onBaseUrlChange={(v) => handleModeFieldChange({ plan: "planModeGeminiBaseUrl", act: "actModeGeminiBaseUrl" } as any, v, currentMode)}
              providerName="Gemini"
              signupUrl="https://aistudio.google.com/apikey"
            />
          )}

          {selectedProvider === "vscode-lm" && <VSCodeLmProvider currentMode={currentMode} />}
          {selectedProvider === "ollama" && <OllamaProvider currentMode={currentMode} isPopup={isPopup} showModelOptions={showModelOptions} />}
        </>
      )}

      {apiErrorMessage && <p style={{ margin: "-10px 0 4px 0", fontSize: 12, color: "var(--vscode-errorForeground)" }}>{apiErrorMessage}</p>}
      {modelIdErrorMessage && <p style={{ margin: "-10px 0 4px 0", fontSize: 12, color: "var(--vscode-errorForeground)" }}>{modelIdErrorMessage}</p>}
    </div>
  );
});

export default ApiOptions;

const ProviderDropdownWrapper = styled.div` position: relative; width: 100%; `;
const ProviderDropdownList = styled.div`
	position: absolute;
	top: calc(100% - 3px);
	left: 0;
	width: calc(100% - 2px);
	max-height: 200px;
	overflow-y: auto;
	background-color: var(--vscode-dropdown-background);
	border: 1px solid var(--vscode-list-activeSelectionBackground);
	z-index: ${DROPDOWN_Z_INDEX - 1};
	border-bottom-left-radius: 3px;
	border-bottom-right-radius: 3px;
`;
const ProviderDropdownItem = styled.div<{ isSelected: boolean }>`
	padding: 5px 10px;
	cursor: pointer;
	word-break: break-all;
	white-space: normal;
	background-color: ${({ isSelected }) => (isSelected ? "var(--vscode-list-activeSelectionBackground)" : "inherit")};
	&:hover { background-color: var(--vscode-list-activeSelectionBackground); }
`;
