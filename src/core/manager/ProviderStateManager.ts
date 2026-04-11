/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ApiConfiguration } from '../../shared/api';
import type { StateObserver, StateChangeResult } from '../../domain/state/StateChangeProtocol';
import { LLMProviderRegistry } from './LLMProviderRegistry';
import { StateOrchestrator } from './orchestrator';
import { Logger } from '../../shared/services/Logger';
import type { GlobalState } from '../../domain/LLMProvider';
import type { ModelInfo } from '../../domain/agent/LLMProviderAdapter';
import type { StateChange } from '../../domain/state/StateChangeProtocol';

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
    const registry = LLMProviderRegistry.getInstance();
    
    orchestrator.registerObserver('apiConfiguration', this);
    
    // Bridge registry updates back to orchestrated state
    registry.onModelUpdate((providerId: string, models: ModelInfo[]) => {
      this._syncModelsToState(providerId, models);
    });
    
    registry.onHealthUpdate((providerId: string, health: 'online' | 'offline' | 'error') => {
      this._syncHealthToState(providerId, health);
    });

    Logger.info('[STATE] ProviderStateManager initialized with dynamic sync bridge');
  }

  /**
   * Syncs discovered models to the global state.
   */
  private async _syncModelsToState(providerId: string, models: ModelInfo[]): Promise<void> {
    const orchestrator = StateOrchestrator.getInstance();
    const currentModels = (await orchestrator.getState('availableProviderModels')) || {};
    
    const updatedModels = {
      ...currentModels,
      [providerId]: models
    };

    // Generic map update is sufficient now
    await orchestrator.applyChange({
      key: 'availableProviderModels',
      newValue: updatedModels,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => updatedModels,
      getCorrelationId: () => `registry-update-models-${providerId}-${Date.now()}`
    }, 100); // Small debounce for batch updates
  }

  /**
   * Syncs provider health status to the global state.
   */
  private async _syncHealthToState(providerId: string, health: string): Promise<void> {
    const orchestrator = StateOrchestrator.getInstance();
    const currentHealth = (await orchestrator.getState('providerHealth')) || {};
    
    const updatedHealth = {
      ...currentHealth,
      [providerId]: health
    };

    await orchestrator.applyChange({
      key: 'providerHealth',
      newValue: updatedHealth,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => updatedHealth,
      getCorrelationId: () => `registry-update-health-${providerId}-${Date.now()}`
    }, 0); // Immediate health update
  }

  /**
   * Validates the configuration before applying the change.
   */
  onBeforeChange(change: StateChange<ApiConfiguration>): boolean {
    const config = change.newValue as ApiConfiguration;
    if (!config) return false;

    // PRODUCTION HARDENING: We allow selecting a provider even if the key is missing, 
    // so the user can then enter the key in the settings UI.
    // Validation will still prevent task execution.
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
  private _maskConfig(config: ApiConfiguration): Partial<ApiConfiguration> {
    const masked: Partial<ApiConfiguration> = { ...config };
    const sensitiveKeys: (keyof ApiConfiguration)[] = [
      'geminiApiKey'
    ];

    for (const key of sensitiveKeys) {
      if (masked[key as keyof ApiConfiguration]) {
        (masked as Record<string, string | undefined>)[key] = '********';
      }
    }
    return masked;
  }

  /**
   * Called on error
   */
  onError(error: Error): void {
    Logger.error('[STATE] Provider state sync error:', error);
  }
}
