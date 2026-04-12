/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Secrets, SettingsKey } from "@shared/storage/state-keys";
import {
  type ApiProvider,
  geminiDefaultModelId,
} from "../api";

/**
 * [LAYER: SHARED / STORAGE]
 * Map providers to their specific model ID keys.
 * 
 * SOVEREIGN HARDENING: This module has been restricted to Google Gemini 
 * to align with the strictly Sovereign architecture. All legacy provider 
 * mappings have been decommissioned.
 */

const ProviderKeyMap: Partial<Record<ApiProvider, string>> = {
  gemini: "GeminiModelId",
} as const;

export const ProviderToApiKeyMap: Partial<Record<ApiProvider, keyof Secrets | (keyof Secrets)[]>> = {
  gemini: "geminiApiKey",
} as const;

const ProviderDefaultModelMap: Partial<Record<ApiProvider, string>> = {
  gemini: geminiDefaultModelId,
} as const;

/**
 * Get the provider-specific model ID key for a given provider and mode.
 * Different providers store their model IDs in different state keys.
 */
export function getProviderModelIdKey(provider: ApiProvider, mode: "act" | "plan"): SettingsKey {
  const keySuffix = ProviderKeyMap[provider];
  if (keySuffix) {
    // E.g. actModeGeminiModelId, planModeGeminiModelId, etc.
    return `${mode}Mode${keySuffix}` as SettingsKey;
  }

  // Fallback to generic actModeApiModelId/planModeApiModelId
  return `${mode}ModeApiModelId`;
}

export function getProviderDefaultModelId(provider: ApiProvider): string | null {
  return ProviderDefaultModelMap[provider] || geminiDefaultModelId;
}
