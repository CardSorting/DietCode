/**
 * Verification script for DietCode Provider Sync
 */
import { StateOrchestrator } from './src/core/manager/StateOrchestrator';
import { LLMProviderRegistry } from './src/core/manager/LLMProviderRegistry';
import { ProviderStateManager } from './src/core/manager/ProviderStateManager';
import { GlobalState } from './src/domain/LLMProvider';

async function verifySync() {
  console.log('🚀 Starting Provider Sync Verification...');

  const registry = LLMProviderRegistry.getInstance();
  const orchestrator = StateOrchestrator.getInstance();
  const manager = ProviderStateManager.getInstance();

  // 1. Initialize
  manager.initialize();

  // 2. Mock a change from the UI
  const mockConfig = {
    apiKey: 'sk-ant-test-123',
    apiModelId: 'claude-3-7-sonnet-20250219',
    selectedProvider: 'anthropic' as any,
  };

  console.log('📦 Applying mock state change...');
  await orchestrator.applyChange({
    key: 'apiConfiguration',
    newValue: mockConfig,
    stateSet: {} as GlobalState,
    validate: () => true,
    sanitize: () => mockConfig,
    getCorrelationId: () => 'test-sync',
  }, 0);

  // 3. Check if registry was updated (internal check)
  const adapter = registry.getAdapter('anthropic');
  if (adapter) {
    console.log('✅ Anthropic adapter registered in registry.');
    // Check if it has the right model (via getModelInfo)
    const info = adapter.getModelInfo();
    console.log(`📡 Adapter Model: ${info.id}`);
  } else {
    console.error('❌ Anthropic adapter NOT found in registry after sync.');
  }

  console.log('🏁 Verification complete.');
}

verifySync().catch(console.error);
