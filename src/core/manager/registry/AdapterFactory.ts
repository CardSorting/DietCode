import { GeminiAdapter } from '../../../infrastructure/llm/providers/GeminiAdapter';
import type { AdapterConfig, LLMAdapter } from '../../../domain/agent/LLMProviderAdapter';
import type { ApiConfiguration, ApiProvider } from '../../../shared/api';

/**
 * [LAYER: CORE / REGISTRY]
 * Factory for creating LLM adapters from configuration.
 * Hardened strictly for Gemini-only infrastructure.
 */
export class AdapterFactory {
  /**
   * Create an adapter for the specified provider
   */
  public async createAdapter(providerId: string, config: AdapterConfig): Promise<LLMAdapter> {
    switch (providerId.toLowerCase()) {
      case 'gemini':
        return new GeminiAdapter({
          apiKey: config.apiKey,
          model: config.model || 'gemini-2.0-flash',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });

      default:
        throw new Error(`LLMProviderRegistry: Unsupported provider '${providerId}'. Extension is Gemini-only.`);
    }
  }

  /**
   * Map global API configuration to provider-specific adapter configuration
   */
  public mapConfigToAdapter(providerId: ApiProvider, config: ApiConfiguration): AdapterConfig | undefined {
    switch (providerId) {
      case 'gemini':
        if (!config.geminiApiKey) return undefined;
        return {
          apiKey: config.geminiApiKey,
          model: config.geminiModelId || 'gemini-2.0-flash',
        };
      default:
        return undefined;
    }
  }
}
