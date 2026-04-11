import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLATFORM_CONFIG, PlatformType } from "@/config/platform.config";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { ModelsServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import PROVIDERS from "@shared/providers/providers.json";
import type { Mode } from "@shared/storage/types.ts";
import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import Fuse from "fuse.js";
import { type KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "react-use";
import { StandardProviderLayout } from "./common/StandardProviderLayout";
import {
  geminiModels,
  type ModelInfo,
} from "@shared/api.ts";
import type { ApiProvider } from "@shared/api.ts";
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers";
import { cn } from "@/lib/utils";

interface ApiOptionsProps {
  showModelOptions: boolean;
  apiErrorMessage?: string;
  modelIdErrorMessage?: string;
  isPopup?: boolean;
  currentMode: Mode;
  initialModelTab?: "recommended" | "free";
}

const ApiOptions = memo(({
  showModelOptions,
  apiErrorMessage,
  modelIdErrorMessage,
  isPopup,
  currentMode,
  initialModelTab,
}: ApiOptionsProps) => {
  const { apiConfiguration, remoteConfigSettings, favoritedModelIds, availableProviderModels } = useExtensionState();
  const normalized = normalizeApiConfiguration(apiConfiguration, currentMode);
  const { selectedProvider, selectedModelId, selectedModelInfo } = normalized;
  const { handleModeFieldChange, handleFieldChange, handleModeFieldsChange } = useApiConfigurationHandlers();

  // Provider search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isInternalChangeRef = useRef(false);

  const providerOptions = useMemo(() => {
    return PROVIDERS.list;
  }, []);

  const currentProviderLabel = useMemo(() => {
    return providerOptions.find((option) => option.value === selectedProvider)?.label || selectedProvider;
  }, [providerOptions, selectedProvider]);

  useEffect(() => {
    if (!isDropdownVisible) {
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false;
        return;
      }
      setSearchTerm(currentProviderLabel);
    }
  }, [currentProviderLabel, isDropdownVisible]);

  const searchableItems = useMemo(() => providerOptions.map((option) => ({ value: option.value, label: option.label })), [providerOptions]);
  const fuse = useMemo(() => new Fuse(searchableItems, { keys: ["label"], threshold: 0.3 }), [searchableItems]);
  const providerSearchResults = useMemo(() => searchTerm && searchTerm !== currentProviderLabel ? fuse.search(searchTerm).map((r) => r.item) : searchableItems, [searchableItems, searchTerm, fuse, currentProviderLabel]);

  const handleProviderChange = (newProvider: string) => {
    isInternalChangeRef.current = true;
    const newLabel = providerOptions.find((o) => o.value === newProvider)?.label || newProvider;
    setSearchTerm(newLabel);
    handleModeFieldChange({ plan: "planModeApiProvider", act: "actModeApiProvider" }, newProvider as ApiProvider, currentMode);
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

  const handleInputBlur = useCallback(() => {
    // Small timeout to allow list clicks to register first
    setTimeout(() => {
      const matchingProvider = providerOptions.find(o => o.label.toLowerCase() === searchTerm.trim().toLowerCase() || o.value.toLowerCase() === searchTerm.trim().toLowerCase());
      if (!searchTerm || searchTerm.trim() === "" || !matchingProvider) {
        setSearchTerm(currentProviderLabel);
      } else if (matchingProvider.value !== selectedProvider) {
        handleProviderChange(matchingProvider.value);
      }
    }, 150);
  }, [searchTerm, currentProviderLabel, providerOptions, selectedProvider, handleProviderChange]);

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

  return (
    <div className={cn("flex flex-col gap-1", isPopup && "-mb-2.5")}>
      {/* Provider Selector */}
      <div className="relative z-50">
        <label
          // biome-ignore lint/a11y/noLabelWithoutControl: VSCodeTextField is a valid custom control for this label
          htmlFor="api-provider-search"
          className="flex items-center gap-1 mb-1"
        >
          <span className="text-xs font-semibold opacity-80">API Provider</span>
          {Array.isArray(remoteConfigSettings?.remoteConfiguredProviders) && remoteConfigSettings.remoteConfiguredProviders.length > 0 && (
            <Tooltip>
              <TooltipTrigger><i className="codicon codicon-lock text-[10px] opacity-50" /></TooltipTrigger>
              <TooltipContent>Managed by organization</TooltipContent>
            </Tooltip>
          )}
        </label>
        
        <div ref={dropdownRef} className="relative">
          <VSCodeTextField
            id="api-provider-search"
            onFocus={() => { setIsDropdownVisible(true); setSearchTerm(""); }}
            onInput={(e) => { setSearchTerm((e.target as HTMLInputElement)?.value || ""); setIsDropdownVisible(true); }}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder="Search provider..."
            className="w-full"
            value={searchTerm}
          />
          {isDropdownVisible && (
            <div
              // biome-ignore lint/a11y/useSemanticElements: Custom search dropdown requires non-standard structure
              role="listbox"
              tabIndex={-1}
              className="absolute top-[calc(100%+2px)] left-0 w-full max-h-48 overflow-y-auto bg-menu border border-menu-border animate-in fade-in slide-in-from-top-1 duration-200 rounded-md shadow-lg scrollbar-thin"
            >
              {providerSearchResults.map((item, index) => (
                <div
                  key={item.value}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onClick={() => handleProviderChange(item.value)}
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleProviderChange(item.value); }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  tabIndex={0}
                  // biome-ignore lint/a11y/useSemanticElements: Custom search dropdown requires non-standard structure
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={cn(
                    "px-3 py-1.5 cursor-pointer text-sm transition-colors break-all outline-none",
                    index === selectedIndex ? "bg-selection text-selection-foreground" : "text-description hover:bg-list-hover"
                  )}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provider Settings */}
      {apiConfiguration && (
        <div className="space-y-4 mt-2">
          {selectedProvider === "gemini" && (
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.geminiApiKey || ""}
              baseUrl={apiConfiguration.geminiBaseUrl}
              baseUrlPlaceholder="Default: https://generativelanguage.googleapis.com"
              models={availableProviderModels?.gemini ? Object.fromEntries(availableProviderModels.gemini.map(m => [m.id, m])) : geminiModels}
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeGeminiApiKey", act: "actModeGeminiApiKey" }, v as string, currentMode)}
              onBaseUrlChange={(v) => handleModeFieldChange({ plan: "planModeGeminiBaseUrl", act: "actModeGeminiBaseUrl" }, v as string, currentMode)}
              providerName="Gemini"
              signupUrl="https://aistudio.google.com/apikey"
            />
          )}
        </div>
      )}

      {apiErrorMessage && <p className="mt-1 text-xs text-error animate-in shake-1">{apiErrorMessage}</p>}
      {modelIdErrorMessage && <p className="mt-1 text-xs text-error animate-in shake-1">{modelIdErrorMessage}</p>}
    </div>
  );
});

export default ApiOptions;
