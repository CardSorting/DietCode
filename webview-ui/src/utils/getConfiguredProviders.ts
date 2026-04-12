/** [LAYER: WEBVIEW / UTILS] */
import type { ApiConfiguration, ApiProvider } from "@shared/api";
import PROVIDERS from "@shared/providers/providers.json";
import type { RemoteConfigFields } from "@shared/storage/state-keys";

/**
 * Returns a list of API providers that are configured (have required credentials/settings)
 * Based on validation logic from validate.ts
 */
export function getConfiguredProviders(
  _remoteConfig: Partial<RemoteConfigFields> | undefined,
  _apiConfiguration: ApiConfiguration | undefined,
): ApiProvider[] {
  // Only Gemini is available now
  return ["gemini"];
}

/**
 * Get provider display label from provider value
 * Uses the canonical providers.json as source of truth
 */
export function getProviderLabel(provider: ApiProvider): string {
  const providerEntry = PROVIDERS.list.find((p) => p.value === provider);
  return providerEntry?.label || provider;
}
