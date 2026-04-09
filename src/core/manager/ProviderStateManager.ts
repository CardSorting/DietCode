/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ApiConfiguration } from '../../shared/api';
import type { StateObserver, StateChangeResult } from '../../domain/state/StateChangeProtocol';
import { LLMProviderRegistry } from './LLMProviderRegistry';
import { StateOrchestrator } from './StateOrchestrator';
import { Logger } from '../../shared/services/Logger';

/**
 * [LAYER: CORE]
 * Manages the synchronization between persistent state and live LLM adapters.
 * Listens for configuration changes and ensures the registry is always current.
 */
export class ProviderStateManager implements StateObserver<ApiConfiguration> {
  private static instance: ProviderStateManager | null = null;

  private constructor() {}

  static getInstance(): ProviderStateManager {
    if (!ProviderStateManager.instance) {
      ProviderStateManager.instance = new ProviderStateManager();
    }
    return ProviderStateManager.instance;
  }

  /**
   * Initialize and register with the orchestrator
   */
  initialize(): void {
    const orchestrator = StateOrchestrator.getInstance();
    orchestrator.registerObserver('apiConfiguration', this);
    Logger.info('[STATE] ProviderStateManager initialized and observing apiConfiguration');
  }

  /**
   * Validates the configuration before applying the change.
   */
  onBeforeChange(change: any): boolean {
    const config = change.newValue as ApiConfiguration;
    if (!config) return false;

    // Strict Validation: Ensure at least one provider has enough info if selected
    if (config.selectedProvider) {
      if (config.selectedProvider === 'anthropic' && !config.apiKey) {
        Logger.warn('[STATE] Rejected config: Anthropic selected but no API key provided');
        return false;
      }
      if ((config.selectedProvider === 'openai' || config.selectedProvider === 'openai-native') && !config.openAiApiKey) {
        Logger.warn('[STATE] Rejected config: OpenAI selected but no API key provided');
        return false;
      }
    }

    return true;
  }

  /**
   * Called when the configuration change is completed.
   * PRODUCTION HARDENING: Synchronizes the registry and logs a masked configuration.
   */
  async onChange(result: StateChangeResult<ApiConfiguration>): Promise<void> {
    if (result.success && result.sanitizedValue) {
      const masked = this._maskConfig(result.sanitizedValue);
      Logger.info('[STATE] Configuration changed, syncing registry...', { config: masked });
      
      await LLMProviderRegistry.getInstance().updateActiveConfiguration(result.sanitizedValue);
    }
  }

  /**
   * Redacts sensitive keys for secure logging.
   */
  private _maskConfig(config: ApiConfiguration): any {
    const masked = { ...config } as any;
    const sensitiveKeys = [
      'apiKey', 'openAiApiKey', 'geminiApiKey', 'openRouterApiKey',
      'awsAccessKey', 'awsSecretKey', 'azureApiKey'
    ];

    for (const key of sensitiveKeys) {
      if (masked[key]) {
        masked[key] = '********';
      }
    }
    return masked;
  }

  /**
   * Called on error
   */
  onError(error: any): void {
    Logger.error('[STATE] Provider state sync error:', error);
  }
}
