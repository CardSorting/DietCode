import {
  type ApiConfiguration,
  type ApiProvider,
  type ModelInfo,
  geminiDefaultModelId,
  geminiModels,
} from "@shared/api";
import type { Mode } from "@shared/storage/types.ts";
import * as reasoningSupport from "@shared/utils/reasoning-support";

/**
 * [LAYER: WEBVIEW / UTILS]
 * Provider utilities hardened strictly for Gemini.
 */

export function supportsReasoningEffortForModelId(
  modelId?: string,
): boolean {
  return reasoningSupport.supportsReasoningEffortForModel(modelId);
}

/**
 * Returns the static model list for Gemini.
 */
export function getModelsForProvider(
  provider: ApiProvider,
): Record<string, ModelInfo> | undefined {
  if (provider === "gemini") {
    return geminiModels as unknown as Record<string, ModelInfo>;
  }
  return undefined;
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
  const provider = "gemini";
  const modelId =
    currentMode === "plan"
      ? apiConfiguration?.planModeApiModelId
      : apiConfiguration?.actModeApiModelId;

  const models = geminiModels;
  const defaultId = geminiDefaultModelId;

  let selectedModelId: string;
  let selectedModelInfo: ModelInfo;
  
  if (modelId && modelId in models) {
    selectedModelId = modelId;
    selectedModelInfo = (models as Record<string, ModelInfo>)[modelId];
  } else {
    selectedModelId = defaultId;
    selectedModelInfo = (models as Record<string, ModelInfo>)[defaultId];
  }

  return {
    selectedProvider: provider,
    selectedModelId,
    selectedModelInfo,
  };
}

/**
 * Gets mode-specific field values from API configuration
 */
export function getModeSpecificFields(apiConfiguration: ApiConfiguration | undefined, mode: Mode) {
  if (!apiConfiguration) {
    return {
      apiProvider: "gemini" as ApiProvider,
      apiModelId: undefined,
      geminiModelId: undefined,
      thinkingBudgetTokens: undefined,
      geminiThinkingLevel: undefined,
    };
  }

  return {
    apiProvider: "gemini" as ApiProvider,
    apiModelId:
      mode === "plan" ? apiConfiguration.planModeApiModelId : apiConfiguration.actModeApiModelId,
    geminiModelId: 
      mode === "plan" ? apiConfiguration.planModeApiModelId : apiConfiguration.actModeApiModelId,
    thinkingBudgetTokens:
      mode === "plan"
        ? apiConfiguration.planModeThinkingBudgetTokens
        : apiConfiguration.actModeThinkingBudgetTokens,
    geminiThinkingLevel:
      mode === "plan"
        ? apiConfiguration.geminiPlanModeThinkingLevel
        : apiConfiguration.geminiActModeThinkingLevel,
  };
}

/**
 * Synchronizes mode configurations.
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

  const updates: Partial<ApiConfiguration> = {
    planModeApiProvider: "gemini",
    actModeApiProvider: "gemini",
    planModeApiModelId: sourceFields.apiModelId,
    actModeApiModelId: sourceFields.apiModelId,
    planModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
    actModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
    geminiPlanModeThinkingLevel: sourceFields.geminiThinkingLevel,
    geminiActModeThinkingLevel: sourceFields.geminiThinkingLevel,
  };

  await handleFieldsChange(updates);
}

// Helper to get provider-specific configuration info
export const getProviderInfo = (
  provider: ApiProvider,
  _apiConfiguration: unknown,
  _effectiveMode: "plan" | "act",
): { modelId?: string; baseUrl?: string; helpText: string } => {
  return {
    modelId: undefined,
    baseUrl: undefined,
    helpText: "Google Gemini is the default provider.",
  };
};
