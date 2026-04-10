import { type AnthropicModelId, anthropicModels } from "@/shared/api";
import type { ApiHandlerModel, ApiProviderInfo } from "@core/api";

export { supportsReasoningEffortForModel } from "@shared/utils/reasoning-support";

const CLAUDE_VERSION_MATCH_REGEX = /[-_ ]([\d](?:\.[05])?)[-_ ]?/;
export const GEMINI_FLASH_MAX_OUTPUT_TOKENS = 8_192;

export function isNextGenModelProvider(providerInfo: ApiProviderInfo): boolean {
  const providerId = normalize(providerInfo.providerId);
  return ["cline", "anthropic", "gemini", "openrouter", "openai", "openai-native"].some(
    (id) => providerId === id,
  );
}

export function modelDoesntSupportWebp(apiHandlerModel: ApiHandlerModel): boolean {
  return false; // All current supported models handle WebP or have server-side fallback
}

/**
 * Determines if reasoning content should be skipped for a given model
 */
export function shouldSkipReasoningForModel(modelId?: string): boolean {
  return false;
}

export function isAnthropicModelId(modelId: string): modelId is AnthropicModelId {
  const CLAUDE_MODELS = ["sonnet", "opus", "haiku"];
  return (
    modelId in anthropicModels || CLAUDE_MODELS.some((substring) => modelId.includes(substring))
  );
}

export function isClaude4PlusModelFamily(id: string): boolean {
  const modelId = normalize(id);
  // Claude Code short aliases are always Claude 4+
  // These are used by ClaudeCodeHandler.getModel() when user selects "sonnet" or "opus"
  // Check before isAnthropicModelId to avoid type guard narrowing issues
  if (modelId === "sonnet" || modelId === "opus") {
    return true;
  }
  if (!isAnthropicModelId(modelId)) {
    return false;
  }
  // Get model version number
  const versionMatch = modelId.match(CLAUDE_VERSION_MATCH_REGEX);
  if (!versionMatch) {
    return false;
  }
  const version = Number.parseFloat(versionMatch[1]);
  // Check if version is 4.0 or higher
  return version >= 4;
}

export function isNextGenModelFamily(id: string): boolean {
  const modelId = normalize(id);
  return isClaude4PlusModelFamily(modelId);
}

export function isLocalModel(providerInfo: ApiProviderInfo): boolean {
  const localProviders = ["lmstudio", "ollama"];
  return localProviders.includes(normalize(providerInfo.providerId));
}

/**
 * Parses a price string and converts it from per-token to per-million-tokens
 * @param priceString The price string to parse (e.g. from API responses)
 * @returns The price multiplied by 1,000,000 for per-million-token pricing, or 0 if invalid
 */
export function parsePrice(priceString: string | undefined): number {
  if (!priceString || priceString === "" || priceString === "0") {
    return 0;
  }
  const parsed = Number.parseFloat(priceString);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  // Convert from per-token to per-million-tokens (multiply by 1,000,000)
  return parsed * 1_000_000;
}

/**
 * Determines if the given provider and model combination will use native tool calling.
 * Helpful if we need to quickly check this for prompts or other logic.
 * @param providerInfo The provider and model information
 * @param enableNativeToolCalls Whether the native tool calls setting is enabled
 * @returns true if the model will use native tool calling, false otherwise
 */
export function isNativeToolCallingConfig(
  providerInfo: ApiProviderInfo,
  enableNativeToolCalls: boolean,
): boolean {
  if (!enableNativeToolCalls) {
    return false;
  }
  if (!isNextGenModelProvider(providerInfo)) {
    return false;
  }
  const modelId = providerInfo.model.id.toLowerCase();
  return isNextGenModelFamily(modelId);
}

/**
 * Check if parallel tool calling is enabled.
 * Parallel tool calling is enabled if:
 * 1. User has enabled it in settings, OR
 * 2. The current model/provider supports native tool calling and handles parallel tools well
 */
export function isParallelToolCallingEnabled(
  enableParallelSetting: boolean,
  providerInfo: ApiProviderInfo,
): boolean {
  if (enableParallelSetting) {
    return true;
  }
  if (!providerInfo.providerId) {
    return false;
  }
  return isNativeToolCallingConfig(providerInfo, true) || isGPT5ModelFamily(providerInfo.model.id);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}
