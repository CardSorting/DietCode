import { getModeSpecificFields } from "@/components/settings/utils/providerUtils";
import { type ApiConfiguration, type ModelInfo, openRouterDefaultModelId } from "@shared/api.ts";
import type { Mode } from "@shared/storage/types.ts";

export function validateApiConfiguration(
  currentMode: Mode,
  apiConfiguration?: ApiConfiguration,
): string | undefined {
  if (apiConfiguration) {
    const {
      apiProvider,
      openAiModelId,
      requestyModelId,
      togetherModelId,
      ollamaModelId,
      lmStudioModelId,
      vsCodeLmModelSelector,
    } = getModeSpecificFields(apiConfiguration, currentMode);

    switch (apiProvider) {
      case "anthropic":
        if (!apiConfiguration.apiKey) {
          return "You must provide a valid API key or choose a different provider.";
        }
        break;
      case "openrouter":
        if (!apiConfiguration.openRouterApiKey) {
          return "You must provide a valid API key or choose a different provider.";
        }
        break;
      case "gemini":
        if (!apiConfiguration.geminiApiKey) {
          return "You must provide a valid API key or choose a different provider.";
        }
        break;
      case "openai-native":
        if (!apiConfiguration.openAiNativeApiKey) {
          return "You must provide a valid API key or choose a different provider.";
        }
        break;
      case "cline":
        break;
      case "openai":
        if (
          !apiConfiguration.openAiBaseUrl ||
          (!apiConfiguration.openAiApiKey && !apiConfiguration.azureIdentity) ||
          !openAiModelId
        ) {
          return "You must provide a valid base URL, API key, and model ID.";
        }
        break;
      case "ollama":
        if (!ollamaModelId) {
          return "You must provide a valid model ID.";
        }
        break;
      case "vscode-lm":
        if (!vsCodeLmModelSelector) {
          return "You must provide a valid model selector.";
        }
        break;
    }
    }
  }
  return undefined;
}

export function validateModelId(
  currentMode: Mode,
  apiConfiguration?: ApiConfiguration,
  openRouterModels?: Record<string, ModelInfo>,
  clineModels?: Record<string, ModelInfo>,
): string | undefined {
  if (apiConfiguration) {
    const { apiProvider, openRouterModelId, clineModelId } = getModeSpecificFields(
      apiConfiguration,
      currentMode,
    );
    switch (apiProvider) {
      case "openrouter": {
        const modelId = openRouterModelId || openRouterDefaultModelId; // in case the user hasn't changed the model id, it will be undefined by default
        if (!modelId) {
          return "You must provide a model ID.";
        }
        if (openRouterModels && !Object.keys(openRouterModels).includes(modelId)) {
          // even if the model list endpoint failed, extensionstatecontext will always have the default model info
          return "The model ID you provided is not available. Please choose a different model.";
        }
        break;
      }
      case "cline": {
        const clineResolvedModelId = clineModelId || openRouterDefaultModelId;
        if (!clineResolvedModelId) {
          return "You must provide a model ID.";
        }
        if (clineModels && !Object.keys(clineModels).includes(clineResolvedModelId)) {
          return "The model ID you provided is not available. Please choose a different model.";
        }
        break;
      }
    }
  }
  return undefined;
}
