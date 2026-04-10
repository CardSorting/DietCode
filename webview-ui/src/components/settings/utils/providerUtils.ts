import {
  type ApiConfiguration,
  type ApiProvider,
  type ModelInfo,
  anthropicDefaultModelId,
  anthropicModels,
  geminiDefaultModelId,
  geminiModels,
  openAiModelInfoSaneDefaults,
  openAiNativeDefaultModelId,
  openAiNativeModels,
  openRouterDefaultModelId,
  openRouterDefaultModelInfo,
} from "@shared/api";
import type { Mode } from "@shared/storage/types.ts";
import * as reasoningSupport from "@shared/utils/reasoning-support";

export function supportsReasoningEffortForModelId(
  modelId?: string,
  _allowShortOpenAiIds = false,
): boolean {
  return reasoningSupport.supportsReasoningEffortForModel(modelId);
}

/**
 * Returns the static model list for a provider.
 * For providers with dynamic models (openrouter, cline, ollama, etc.), returns undefined.
 * Some providers depend on configuration (qwen, zai) for region-specific models.
 */
export function getModelsForProvider(
  provider: ApiProvider,
): Record<string, ModelInfo> | undefined {
  switch (provider) {
    case "anthropic":
      return anthropicModels;
    case "gemini":
      return geminiModels;
    case "openai-native":
      return openAiNativeModels;
    default:
      return undefined;
  }
}

/**
 * Interface for normalized API configuration
 */
export interface NormalizedApiConfig {
  selectedProvider: ApiProvider;
  selectedModelId: string;
  selectedModelInfo: ModelInfo;
}

/**
 * Normalizes API configuration to ensure consistent values
 */
export function normalizeApiConfiguration(
  apiConfiguration: ApiConfiguration | undefined,
  currentMode: Mode,
): NormalizedApiConfig {
  const provider =
    (currentMode === "plan"
      ? apiConfiguration?.planModeApiProvider
      : apiConfiguration?.actModeApiProvider) || "anthropic";

  const modelId =
    currentMode === "plan"
      ? apiConfiguration?.planModeApiModelId
      : apiConfiguration?.actModeApiModelId;

  const getProviderData = (models: Record<string, ModelInfo>, defaultId: string) => {
    let selectedModelId: string;
    let selectedModelInfo: ModelInfo;
    if (modelId && modelId in models) {
      selectedModelId = modelId;
      selectedModelInfo = models[modelId];
    } else {
      selectedModelId = defaultId;
      selectedModelInfo = models[defaultId];
    }
    return {
      selectedProvider: provider,
      selectedModelId,
      selectedModelInfo,
    };
  };

  switch (provider) {
    case "anthropic": {
      const data = getProviderData(anthropicModels, anthropicDefaultModelId);
      return { selectedProvider: "anthropic" as ApiProvider, ...data };
    }
    case "gemini": {
      const data = getProviderData(geminiModels, geminiDefaultModelId);
      return { selectedProvider: "gemini" as ApiProvider, ...data };
    }
    case "openai-native": {
      const data = getProviderData(openAiNativeModels, openAiNativeDefaultModelId);
      return { selectedProvider: "openai-native" as ApiProvider, ...data };
    }
    case "openrouter": {
      const openRouterModelId =
        currentMode === "plan"
          ? apiConfiguration?.planModeOpenRouterModelId
          : apiConfiguration?.actModeOpenRouterModelId;
      const openRouterModelInfo =
        currentMode === "plan"
          ? apiConfiguration?.planModeOpenRouterModelInfo
          : apiConfiguration?.actModeOpenRouterModelInfo;
      return {
        selectedProvider: "openrouter" as ApiProvider,
        selectedModelId: openRouterModelId || openRouterDefaultModelId,
        selectedModelInfo: openRouterModelInfo || openRouterDefaultModelInfo,
      };
    }
    case "cline": {
      const fallbackOpenRouterModelId =
        currentMode === "plan"
          ? apiConfiguration?.planModeOpenRouterModelId
          : apiConfiguration?.actModeOpenRouterModelId;
      const fallbackOpenRouterModelInfo =
        currentMode === "plan"
          ? apiConfiguration?.planModeOpenRouterModelInfo
          : apiConfiguration?.actModeOpenRouterModelInfo;
      const clineModelId =
        (currentMode === "plan"
          ? apiConfiguration?.planModeClineModelId
          : apiConfiguration?.actModeClineModelId) ||
        fallbackOpenRouterModelId ||
        openRouterDefaultModelId;
      const clineModelInfo =
        (currentMode === "plan"
          ? apiConfiguration?.planModeClineModelInfo
          : apiConfiguration?.actModeClineModelInfo) ||
        fallbackOpenRouterModelInfo ||
        openRouterDefaultModelInfo;
      return {
        selectedProvider: "cline" as ApiProvider,
        selectedModelId: clineModelId,
        selectedModelInfo: clineModelInfo,
      };
    }
    case "openai": {
      const openAiModelId =
        currentMode === "plan"
          ? apiConfiguration?.planModeOpenAiModelId
          : apiConfiguration?.actModeOpenAiModelId;
      const openAiModelInfo =
        currentMode === "plan"
          ? apiConfiguration?.planModeOpenAiModelInfo
          : apiConfiguration?.actModeOpenAiModelInfo;
      return {
        selectedProvider: provider,
        selectedModelId: openAiModelId || "",
        selectedModelInfo: openAiModelInfo || openAiModelInfoSaneDefaults,
      };
    }
    case "ollama": {
      const ollamaModelId =
        currentMode === "plan"
          ? apiConfiguration?.planModeOllamaModelId
          : apiConfiguration?.actModeOllamaModelId;
      return {
        selectedProvider: "ollama" as ApiProvider,
        selectedModelId: ollamaModelId || "",
        selectedModelInfo: {
          ...openAiModelInfoSaneDefaults,
          contextWindow: Number(apiConfiguration?.ollamaApiOptionsCtxNum ?? 32768),
        },
      };
    }
    case "vscode-lm": {
      const vsCodeLmModelSelector =
        currentMode === "plan"
          ? apiConfiguration?.planModeVsCodeLmModelSelector
          : apiConfiguration?.actModeVsCodeLmModelSelector;
      return {
        selectedProvider: "vscode-lm" as ApiProvider,
        selectedModelId: vsCodeLmModelSelector
          ? `${vsCodeLmModelSelector.vendor}/${vsCodeLmModelSelector.family}`
          : "",
        selectedModelInfo: {
          ...openAiModelInfoSaneDefaults,
          supportsImages: false, // VSCode LM API currently doesn't support images
        },
      };
    }
    default:
      return getProviderData(anthropicModels, anthropicDefaultModelId);
  }
}

/**
 * Gets mode-specific field values from API configuration
 * @param apiConfiguration The API configuration object
 * @param mode The current mode ("plan" or "act")
 * @returns Object containing mode-specific field values for clean destructuring
 */
export function getModeSpecificFields(apiConfiguration: ApiConfiguration | undefined, mode: Mode) {
  if (!apiConfiguration) {
    return {
      // Core fields
      apiProvider: undefined,
      apiModelId: undefined,

      // Provider-specific model IDs
      ollamaModelId: undefined,
      openAiModelId: undefined,
      openRouterModelId: undefined,
      clineModelId: undefined,
      requestyModelId: undefined,
      togetherModelId: undefined,
      lmStudioModelId: undefined,
      hicapModelId: undefined,

      // Model info objects
      openAiModelInfo: undefined,
      openRouterModelInfo: undefined,
      clineModelInfo: undefined,
      vsCodeLmModelSelector: undefined,

      // Other mode-specific fields
      thinkingBudgetTokens: undefined,
      reasoningEffort: undefined,
    };
  }

  const openRouterModelId =
    mode === "plan"
      ? apiConfiguration.planModeOpenRouterModelId
      : apiConfiguration.actModeOpenRouterModelId;
  const openRouterModelInfo =
    mode === "plan"
      ? apiConfiguration.planModeOpenRouterModelInfo
      : apiConfiguration.actModeOpenRouterModelInfo;

  // Backward compatibility: Cline previously stored model selection in OpenRouter keys.
  const clineModelId =
    (mode === "plan"
      ? apiConfiguration.planModeClineModelId
      : apiConfiguration.actModeClineModelId) || openRouterModelId;
  const clineModelInfo =
    (mode === "plan"
      ? apiConfiguration.planModeClineModelInfo
      : apiConfiguration.actModeClineModelInfo) || openRouterModelInfo;

  return {
    // Core fields
    apiProvider:
      mode === "plan"
        ? (apiConfiguration.planModeApiProvider as ApiProvider)
        : (apiConfiguration.actModeApiProvider as ApiProvider),
    apiModelId:
      mode === "plan" ? apiConfiguration.planModeApiModelId : apiConfiguration.actModeApiModelId,

    // Provider-specific model IDs
    ollamaModelId:
      mode === "plan"
        ? apiConfiguration.planModeOllamaModelId
        : apiConfiguration.actModeOllamaModelId,
    openAiModelId:
      mode === "plan"
        ? apiConfiguration.planModeOpenAiModelId
        : apiConfiguration.actModeOpenAiModelId,
    openRouterModelId,
    clineModelId,
    requestyModelId: apiConfiguration.requestyModelId,
    togetherModelId: apiConfiguration.togetherModelId,
    lmStudioModelId: apiConfiguration.lmStudioModelId,
    hicapModelId: apiConfiguration.hicapModelId,

    // Model info objects
    openAiModelInfo:
      mode === "plan"
        ? apiConfiguration.planModeOpenAiModelInfo
        : apiConfiguration.actModeOpenAiModelInfo,
    openRouterModelInfo,
    clineModelInfo,
    vsCodeLmModelSelector:
      mode === "plan"
        ? apiConfiguration.planModeVsCodeLmModelSelector
        : apiConfiguration.actModeVsCodeLmModelSelector,

    // Other mode-specific fields
    thinkingBudgetTokens:
      mode === "plan"
        ? apiConfiguration.planModeThinkingBudgetTokens
        : apiConfiguration.actModeThinkingBudgetTokens,
    reasoningEffort:
      mode === "plan"
        ? apiConfiguration.planModeReasoningEffort
        : apiConfiguration.actModeReasoningEffort,
  };
}

/**
 * Synchronizes mode configurations by copying the source mode's settings to both modes
 * This is used when the "Use different models for Plan and Act modes" toggle is unchecked
 */
export async function syncModeConfigurations(
  apiConfiguration: ApiConfiguration | undefined,
  sourceMode: Mode,
  handleFieldsChange: (updates: Partial<ApiConfiguration>) => Promise<void>,
): Promise<void> {
  if (!apiConfiguration) {
    return;
  }

  const sourceFields = getModeSpecificFields(apiConfiguration, sourceMode);
  const { apiProvider } = sourceFields;

  if (!apiProvider) {
    return;
  }

  // Build the complete update object with both plan and act mode fields
  const updates: Partial<ApiConfiguration> = {
    // Always sync common fields
    planModeApiProvider: sourceFields.apiProvider || "anthropic" as ApiProvider,
    actModeApiProvider: sourceFields.apiProvider || "anthropic" as ApiProvider,
    planModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
    actModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
    planModeReasoningEffort: sourceFields.reasoningEffort,
    actModeReasoningEffort: sourceFields.reasoningEffort,
  };

  // Handle provider-specific fields
  switch (apiProvider) {
    case "openrouter":
      updates.planModeApiProvider = sourceFields.apiProvider || "openrouter" as ApiProvider;
      updates.actModeApiProvider = sourceFields.apiProvider || "openrouter" as ApiProvider;
      updates.planModeOpenRouterModelId = sourceFields.openRouterModelId;
      updates.actModeOpenRouterModelId = sourceFields.openRouterModelId;
      updates.planModeOpenRouterModelInfo = sourceFields.openRouterModelInfo;
      updates.actModeOpenRouterModelInfo = sourceFields.openRouterModelInfo;
      break;

    case "cline":
      updates.planModeApiProvider = sourceFields.apiProvider || "cline" as ApiProvider;
      updates.actModeApiProvider = sourceFields.apiProvider || "cline" as ApiProvider;
      updates.planModeClineModelId = sourceFields.clineModelId;
      updates.actModeClineModelId = sourceFields.clineModelId;
      updates.planModeClineModelInfo = sourceFields.clineModelInfo;
      updates.actModeClineModelInfo = sourceFields.clineModelInfo;
      break;

    case "openai":
      updates.planModeApiProvider = sourceFields.apiProvider || "openai" as ApiProvider;
      updates.actModeApiProvider = sourceFields.apiProvider || "openai" as ApiProvider;
      updates.planModeOpenAiModelId = sourceFields.openAiModelId;
      updates.actModeOpenAiModelId = sourceFields.openAiModelId;
      updates.planModeOpenAiModelInfo = sourceFields.openAiModelInfo;
      updates.actModeOpenAiModelInfo = sourceFields.openAiModelInfo;
      break;

    case "ollama":
      updates.planModeApiProvider = sourceFields.apiProvider || "ollama" as ApiProvider;
      updates.actModeApiProvider = sourceFields.apiProvider || "ollama" as ApiProvider;
      updates.planModeOllamaModelId = sourceFields.ollamaModelId;
      updates.actModeOllamaModelId = sourceFields.ollamaModelId;
      break;

    case "vscode-lm":
      updates.planModeApiProvider = sourceFields.apiProvider || "vscode-lm" as ApiProvider;
      updates.actModeApiProvider = sourceFields.apiProvider || "vscode-lm" as ApiProvider;
      updates.planModeVsCodeLmModelSelector = sourceFields.vsCodeLmModelSelector;
      updates.actModeVsCodeLmModelSelector = sourceFields.vsCodeLmModelSelector;
      break;

    default:
      updates.planModeApiModelId = sourceFields.apiModelId;
      updates.actModeApiModelId = sourceFields.apiModelId;
      break;
  }

  // Make the atomic update
  await handleFieldsChange(updates);
}

export { filterOpenRouterModelIds } from "@shared/utils/model-filters";

// Helper to get provider-specific configuration info and empty state guidance
export const getProviderInfo = (
  provider: ApiProvider,
  apiConfiguration: any,
  effectiveMode: "plan" | "act",
): { modelId?: string; baseUrl?: string; helpText: string } => {
  switch (provider) {
    case "ollama":
      return {
        modelId:
          effectiveMode === "plan"
            ? apiConfiguration.planModeOllamaModelId
            : apiConfiguration.actModeOllamaModelId,
        baseUrl: apiConfiguration.ollamaBaseUrl,
        helpText: "Run `ollama serve` and pull a model",
      };
    case "openai":
      return {
        modelId:
          effectiveMode === "plan"
            ? apiConfiguration.planModeOpenAiModelId
            : apiConfiguration.actModeOpenAiModelId,
        baseUrl: apiConfiguration.openAiBaseUrl,
        helpText: "Add your OpenAI API key and endpoint",
      };
    case "vscode-lm":
      return {
        modelId: undefined,
        baseUrl: undefined,
        helpText: "Select a VS Code language model from settings",
      };
    default:
      return {
        modelId: undefined,
        baseUrl: undefined,
        helpText: "Configure this provider in model settings",
      };
  }
};
