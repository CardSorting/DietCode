import { getModeSpecificFields } from "@/components/settings/utils/providerUtils";
import type { ApiConfiguration } from "@shared/api.ts";
import type { Mode } from "@shared/storage/types.ts";

/**
 * [LAYER: WEBVIEW / UTILS]
 * Configuration validation hardened strictly for Gemini.
 */

export function validateApiConfiguration(
  currentMode: Mode,
  apiConfiguration?: ApiConfiguration,
): string | undefined {
  if (apiConfiguration) {
    const { apiProvider } = getModeSpecificFields(apiConfiguration, currentMode);

    switch (apiProvider) {
      case "gemini":
        if (!apiConfiguration.geminiApiKey) {
          return "You must provide a valid Gemini API key.";
        }
        break;
      default:
        // Defaulting to Gemini validation if provider is unset or legacy
        if (!apiConfiguration.geminiApiKey) {
            return "A Gemini API key is required to use DietCode.";
        }
    }
  }
  return undefined;
}

/**
 * Validates the model ID for the current mode.
 * Streamlined for Gemini-only infrastructure.
 */
export function validateModelId(
  currentMode: Mode,
  apiConfiguration?: ApiConfiguration,
): string | undefined {
  if (apiConfiguration) {
    const { apiProvider, geminiModelId } = getModeSpecificFields(
      apiConfiguration,
      currentMode,
    );
    
    if (apiProvider === "gemini") {
        if (!geminiModelId) {
            return "Please select a Gemini model.";
        }
    }
  }
  return undefined;
}
