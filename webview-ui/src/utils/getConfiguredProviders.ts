import type { ApiConfiguration, ApiProvider } from "@shared/api";
import PROVIDERS from "@shared/providers/providers.json";
import type { RemoteConfigFields } from "@shared/storage/state-keys";

/**
 * Returns a list of API providers that are configured (have required credentials/settings)
 * Based on validation logic from validate.ts
 */
export function getConfiguredProviders(
  remoteConfig: Partial<RemoteConfigFields> | undefined,
  apiConfiguration: ApiConfiguration | undefined,
): ApiProvider[] {
  if (remoteConfig?.remoteConfiguredProviders?.length) {
    return remoteConfig.remoteConfiguredProviders;
  }

  const configured: ApiProvider[] = [];

  if (!apiConfiguration) {
    return ["cline"]; // Cline is always available
  }

  // Cline - always available (uses account-based auth)
  configured.push("cline");

  // Anthropic - requires API key
  if (apiConfiguration.apiKey) {
    configured.push("anthropic");
  }

  // OpenRouter - requires API key
  if (apiConfiguration.openRouterApiKey) {
    configured.push("openrouter");
  }

  // Gemini - requires API key
  if (apiConfiguration.geminiApiKey) {
    configured.push("gemini");
  }

  // OpenAI Native - requires API key
  if (apiConfiguration.openAiNativeApiKey) {
    configured.push("openai-native");
  }

  // OpenAI Compatible - requires base URL and API key, OR has model configured
  if (
    (apiConfiguration.openAiBaseUrl && apiConfiguration.openAiApiKey) ||
    apiConfiguration.planModeOpenAiModelId ||
    apiConfiguration.actModeOpenAiModelId
  ) {
    configured.push("openai");
  }

  // Ollama - local provider, check base URL OR model configured
  if (
    apiConfiguration.ollamaBaseUrl ||
    apiConfiguration.planModeOllamaModelId ||
    apiConfiguration.actModeOllamaModelId
  ) {
    configured.push("ollama");
  }

  // VSCode LM - always potentially available
  configured.push("vscode-lm");

  return configured;
}

/**
 * Get provider display label from provider value
 * Uses the canonical providers.json as source of truth
 */
export function getProviderLabel(provider: ApiProvider): string {
  const providerEntry = PROVIDERS.list.find((p) => p.value === provider);
  return providerEntry?.label || provider;
}
