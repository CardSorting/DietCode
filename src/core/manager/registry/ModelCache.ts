import type { GlobalState } from '../../../domain/LLMProvider';
import { StateOrchestrator } from '../StateOrchestrator';
import type { ModelInfo } from '../../../domain/agent/LLMProviderAdapter';

export interface CachedModel {
  data: ModelInfo;
  timestamp: number;
}

/**
 * [LAYER: CORE / REGISTRY]
 * Manages in-memory caching of discovered models and synchronizes with orchestrated state.
 */
export class ModelCache {
  private models = new Map<string, CachedModel>();

  public set(key: string, model: CachedModel) {
    this.models.set(key, model);
  }

  public get(key: string): CachedModel | undefined {
    return this.models.get(key);
  }

  public clear() {
    this.models.clear();
  }

  /**
   * Sync discovered models to the global state for UI hydration
   */
  public async syncToState(providerId: string, allModels: ModelInfo[]) {
    const orchestrator = StateOrchestrator.getInstance();
    const currentAvailable = await orchestrator.getState<Record<string, ModelInfo[]>>('availableProviderModels') || {};
    
    await orchestrator.applyChange({
      key: 'availableProviderModels',
      newValue: { ...currentAvailable, [providerId]: allModels },
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => ({ ...currentAvailable, [providerId]: allModels }),
      getCorrelationId: () => `model-discovery-${providerId}-${Date.now()}`
    }, 0);
  }
}
