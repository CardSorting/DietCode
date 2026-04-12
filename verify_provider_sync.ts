/**
 * Verification script for DietCode Provider Sync
 */
import { StateOrchestrator } from './src/core/manager/orchestrator';
import { LLMProviderRegistry } from './src/core/manager/LLMProviderRegistry';
import { ProviderStateManager } from './src/core/manager/ProviderStateManager';
import type { GlobalStateAndSettings } from './src/shared/storage/state-keys';

async function verifySync() {
  console.log('🚀 Starting Provider Sync Verification...');

  const registry = LLMProviderRegistry.getInstance();
  const orchestrator = StateOrchestrator.getInstance();
  const manager = ProviderStateManager.getInstance();

  // 1. Initialize
  manager.initialize();

  // 2. Mock a change from the UI (Gemini Only)
  const mockConfig = {
    geminiApiKey: 'sk-ant-test-123',
    geminiModelId: 'gemini-2.0-flash-exp',
    apiProvider: 'gemini' as const,
  };

  console.log('📦 Applying mock state change (Gemini)...');
  await orchestrator.applyChange({
    key: 'apiConfiguration',
    newValue: mockConfig,
    stateSet: {} as GlobalStateAndSettings,
    validate: () => true,
    sanitize: () => mockConfig,
    getCorrelationId: () => 'test-sync',
  }, 0);

  // 3. Check if registry was updated (internal check)
  const adapter = registry.getAdapter('gemini');
  if (adapter) {
    console.log('✅ Gemini adapter registered in registry.');
    // Check if it has the right model (via getModelInfo)
    const info = adapter.getModelInfo();
    console.log(`📡 Adapter Model: ${info.id}`);
  } else {
    console.error('❌ Gemini adapter NOT found in registry after sync.');
  }

  console.log('🏁 Verification complete.');
}

verifySync().catch(console.error);
