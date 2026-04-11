import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExtensionState } from "@/context/ExtensionStateContext";
import type { Mode } from "@shared/storage/types.ts";
import { memo, useMemo } from "react";
import { StandardProviderLayout } from "./common/StandardProviderLayout";
import {
  geminiModels,
} from "@shared/api.ts";
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

/**
 * [LAYER: WEBVIEW / SETTINGS]
 * Hardened strictly for Gemini-only infrastructure.
 * Removes all legacy provider selection logic.
 */
const ApiOptions = memo(({
  showModelOptions,
  apiErrorMessage,
  modelIdErrorMessage,
  isPopup,
  currentMode,
}: ApiOptionsProps) => {
  const { apiConfiguration, remoteConfigSettings, availableProviderModels } = useExtensionState();
  const normalized = normalizeApiConfiguration(apiConfiguration, currentMode);
  const { selectedModelId, selectedModelInfo } = normalized;
  const { handleModeFieldChange } = useApiConfigurationHandlers();

  const isRemoteConfigured = useMemo(() => {
    return Array.isArray(remoteConfigSettings?.remoteConfiguredProviders) && 
           remoteConfigSettings.remoteConfiguredProviders.includes("gemini");
  }, [remoteConfigSettings]);

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
      {/* Static Provider Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">
          Foundation
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-selection/10 border border-selection/20">
            <span className="text-[10px] font-bold text-selection uppercase">Google Gemini</span>
            {isRemoteConfigured && (
              <Tooltip>
                <TooltipTrigger><i className="codicon codicon-lock text-[10px] opacity-70" /></TooltipTrigger>
                <TooltipContent>Managed by organization</TooltipContent>
              </Tooltip>
            )}
        </div>
      </div>

      {/* Gemini Settings */}
      {apiConfiguration && (
        <div className="space-y-4">
            <StandardProviderLayout
              {...commonProps}
              apiKey={apiConfiguration.geminiApiKey || ""}
              baseUrl={apiConfiguration.geminiBaseUrl}
              baseUrlPlaceholder="Default: https://generativelanguage.googleapis.com"
              models={availableProviderModels?.gemini || geminiModels}
              onApiKeyChange={(v) => handleModeFieldChange({ plan: "planModeGeminiApiKey", act: "actModeGeminiApiKey" }, v as string, currentMode)}
              onBaseUrlChange={(v) => handleModeFieldChange({ plan: "planModeGeminiBaseUrl", act: "actModeGeminiBaseUrl" }, v as string, currentMode)}
              providerName="Gemini"
              signupUrl="https://aistudio.google.com/apikey"
            />
        </div>
      )}

      {apiErrorMessage && <p className="mt-1 text-xs text-error animate-in shake-1">{apiErrorMessage}</p>}
      {modelIdErrorMessage && <p className="mt-1 text-xs text-error animate-in shake-1">{modelIdErrorMessage}</p>}
    </div>
  );
});

export default ApiOptions;
