import type { ModelInfo } from "@shared/api.ts";

/**
 * [LAYER: WEBVIEW / UTILS]
 * Cost calculation hardened strictly for Gemini.
 * Gemini follows the "OpenAI style" where input tokens reported by the API 
 * include the cached/prefilled context.
 */

function calculateApiCostInternal(
  modelInfo: ModelInfo,
  inputTokens: number, // Total input tokens (including cached)
  outputTokens: number,
  cacheCreationInputTokens: number,
  cacheReadInputTokens: number,
  thinkingBudgetTokens?: number,
): number {
  const usedThinkingBudget = thinkingBudgetTokens && thinkingBudgetTokens > 0;

  // Default prices
  let effectiveInputPrice = modelInfo.inputPrice || 0;
  let effectiveOutputPrice = modelInfo.outputPrice || 0;
  let effectiveCacheReadsPrice = modelInfo.cacheReadsPrice || 0;
  let effectiveCacheWritesPrice = modelInfo.cacheWritesPrice || 0;

  // Handle tiered pricing if available
  if (modelInfo.tiers && modelInfo.tiers.length > 0) {
    const sortedTiers = [...modelInfo.tiers].sort((a, b) => a.contextWindow - b.contextWindow);
    const tier = sortedTiers.find((t) => inputTokens <= t.contextWindow);

    if (tier) {
      effectiveInputPrice = tier.inputPrice ?? effectiveInputPrice;
      effectiveOutputPrice = tier.outputPrice ?? effectiveOutputPrice;
      effectiveCacheReadsPrice = tier.cacheReadsPrice ?? effectiveCacheReadsPrice;
      effectiveCacheWritesPrice = tier.cacheWritesPrice ?? effectiveCacheWritesPrice;
    } else {
      const lastTier = sortedTiers[sortedTiers.length - 1];
      if (lastTier) {
        effectiveInputPrice = lastTier.inputPrice ?? effectiveInputPrice;
        effectiveOutputPrice = lastTier.outputPrice ?? effectiveOutputPrice;
        effectiveCacheReadsPrice = lastTier.cacheReadsPrice ?? effectiveCacheReadsPrice;
        effectiveCacheWritesPrice = lastTier.cacheWritesPrice ?? effectiveCacheWritesPrice;
      }
    }
  }

  // Override output price for thinking mode if applicable
  if (usedThinkingBudget && modelInfo.thinkingConfig?.outputPrice !== undefined) {
    effectiveOutputPrice = modelInfo.thinkingConfig.outputPrice;
  }

  // Gemini specific: non-cached tokens are total minus read cache
  // (Input tokens already includes everything)
  const nonCachedInputTokens = Math.max(0, inputTokens - cacheReadInputTokens - cacheCreationInputTokens);

  const cacheWritesCost = (effectiveCacheWritesPrice / 1_000_000) * cacheCreationInputTokens;
  const cacheReadsCost = (effectiveCacheReadsPrice / 1_000_000) * cacheReadInputTokens;
  const baseInputCost = (effectiveInputPrice / 1_000_000) * nonCachedInputTokens;
  const outputCost = (effectiveOutputPrice / 1_000_000) * outputTokens;

  return cacheWritesCost + cacheReadsCost + baseInputCost + outputCost;
}

/**
 * Main cost calculation for Gemini.
 */
export function calculateApiCost(
  modelInfo: ModelInfo,
  inputTokens: number,
  outputTokens: number,
  cacheCreationInputTokens?: number,
  cacheReadInputTokens?: number,
  thinkingBudgetTokens?: number,
): number {
  return calculateApiCostInternal(
    modelInfo,
    inputTokens,
    outputTokens,
    cacheCreationInputTokens || 0,
    cacheReadInputTokens || 0,
    thinkingBudgetTokens,
  );
}
