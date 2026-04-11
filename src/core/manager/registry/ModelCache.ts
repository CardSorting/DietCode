import { StateOrchestrator } from '../orchestrator';
import type { ModelInfo, PromptStrategy } from '../../../domain/agent/LLMProviderAdapter';
import { geminiModels, type ModelInfo as SharedModelInfo } from '../../../shared/api';
import type { GlobalState } from '../../../domain/LLMProvider';

export interface CachedModel {
  data: ModelInfo;
  timestamp: number;
}

/**
 * [LAYER: CORE / REGISTRY]
 * Manages in-memory caching of discovered models and synchronizes with orchestrated state.
 */
export class ModelCache {
	private static instance: ModelCache;

	private constructor() {}

	public static getInstance(): ModelCache {
		if (!ModelCache.instance) {
			ModelCache.instance = new ModelCache();
		}
		return ModelCache.instance;
	}

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
   * Load models for a specific provider.
   * Hardened for Gemini-only infrastructure.
   */
  public async loadProviderModels(providerId: string): Promise<(ModelInfo & { id: string })[]> {
    if (providerId === 'gemini') {
      // Logic: If we have cached models (discovered via API), return them.
      // Otherwise fallback to the hardcoded defaults in shared/api.
      const cached = Array.from(this.models.entries())
        .filter(([key]) => key.startsWith('gemini:'))
        .map(([_, model]) => model.data as ModelInfo & { id: string });

      if (cached.length > 0) {
        return cached;
      }

      // Fallback
      return Object.entries(geminiModels).map(([id, info]) => {
        const sharedInfo = info as SharedModelInfo;
        return {
            id,
            name: sharedInfo.name || id,
            maxTokens: sharedInfo.maxTokens || 8192,
            supportsPromptCache: !!sharedInfo.supportsPromptCache,
            supportsReasoning: !!sharedInfo.supportsReasoning,
            supportsStreaming: true,
            inputPrice: sharedInfo.inputPrice,
            outputPrice: sharedInfo.outputPrice,
            cacheReadsPrice: sharedInfo.cacheReadsPrice,
        };
      });
    }
    return [];
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
