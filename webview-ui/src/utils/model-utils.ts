import type { ApiHandlerModel, ApiProviderInfo } from "@core/api";

/**
 * [LAYER: WEBVIEW / UTILS]
 * Model utilities hardened strictly for Gemini-only infrastructure.
 */

export { supportsReasoningEffortForModel } from "@shared/utils/reasoning-support";

export const GEMINI_FLASH_MAX_OUTPUT_TOKENS = 8_192;

/**
 * Checks if the provider is a next-gen cloud provider.
 * For DietCode, this is exclusively Gemini.
 */
export function isNextGenModelProvider(providerInfo: ApiProviderInfo): boolean {
  const providerId = normalize(providerInfo.providerId);
  return providerId === "gemini";
}

/**
 * Identifies Gemini Flash models (2.0+) for specialized UI behavior.
 */
export function isGeminiFlashModel(id: string): boolean {
  const modelId = normalize(id);
  return (
    modelId.includes("gemini-2.0-flash") ||
    modelId.includes("gemini-2.5-flash") ||
    modelId.includes("gemini-3.0-flash") ||
    modelId.includes("gemini-3-flash")
  );
}

export function modelDoesntSupportWebp(apiHandlerModel: ApiHandlerModel): boolean {
  // All current Gemini models handle WebP/Images natively.
  // We keep a minimal "grok" check only if used through local shims, otherwise return false.
  const modelId = normalize(apiHandlerModel.id);
  return modelId.includes("grok") || modelId.includes("glm");
}

/**
 * Determines if reasoning content should be skipped for a given model.
 */
export function shouldSkipReasoningForModel(modelId?: string): boolean {
  return false;
}

export function isNextGenModelFamily(id: string): boolean {
  const modelId = normalize(id);
  return modelId.includes("gemini-2") || modelId.includes("gemini-3");
}

export function isLocalModel(providerInfo: ApiProviderInfo): boolean {
  return false; // Extension is Gemini-only (Cloud-First)
}

/**
 * Parses a price string and converts it from per-token to per-million-tokens
 */
export function parsePrice(priceString: string | undefined): number {
  if (!priceString || priceString === "" || priceString === "0") {
    return 0;
  }
  const parsed = Number.parseFloat(priceString);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed * 1_000_000;
}

/**
 * Determines if the given provider and model combination will use native tool calling.
 */
export function isNativeToolCallingConfig(
  providerInfo: ApiProviderInfo,
  enableNativeToolCalls: boolean,
): boolean {
  if (!enableNativeToolCalls) {
      return false;
  }
  return isNextGenModelProvider(providerInfo) && isNextGenModelFamily(providerInfo.model.id);
}

/**
 * Check if parallel tool calling is enabled.
 */
export function isParallelToolCallingEnabled(
  enableParallelSetting: boolean,
  providerInfo: ApiProviderInfo,
): boolean {
  if (enableParallelSetting) {
    return true;
  }
  return isNativeToolCallingConfig(providerInfo, true);
}

function normalize(text: string): string {
  return text?.trim().toLowerCase() || "";
}
