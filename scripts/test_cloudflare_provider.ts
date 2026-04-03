/**
 * Verification script for Cloudflare AI Provider
 */
import { CloudflareProvider, CloudflareAdapter } from '../src/infrastructure/llm/providers/CloudflareProvider';
import { ConsoleLoggerAdapter } from '../src/infrastructure/ConsoleLoggerAdapter';
import { LogLevel } from '../src/domain/logging/LogLevel';

async function verify() {
  console.log('--- Cloudflare Provider Verification ---');
  
  const logger = new ConsoleLoggerAdapter();
  logger.setMinLevel(LogLevel.INFO);

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.warn('⚠️  CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not set.');
    console.warn('   Skipping live API connection test.');
  }

  try {
    console.log('1. Instantiating CloudflareProvider (Domain)...');
    const provider = new CloudflareProvider({
      accountId: accountId || 'dummy',
      apiToken: apiToken || 'dummy',
      logService: logger
    });
    console.log('✅ CloudflareProvider instantiated.');

    console.log('2. Instantiating CloudflareAdapter (Core)...');
    const adapter = new CloudflareAdapter({
      accountId: accountId || 'dummy',
      apiToken: apiToken || 'dummy'
    });
    console.log('✅ CloudflareAdapter instantiated.');

    const info = adapter.getModelInfo();
    console.log(`3. Model Info: ${info.name} (ID: ${info.id})`);
    console.log(`   Max Tokens: ${info.maxTokens}`);
    
    console.log('\n--- Verification Successful (Compilation & Registry logic) ---');
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify().catch(console.error);
