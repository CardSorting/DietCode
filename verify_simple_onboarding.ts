import { BootstrapService } from './src/core/setup/BootstrapService';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { TerminalUI } from './src/ui/terminal';

async function test() {
  await SovereignDb.init('./data/test-simple.db');
  const fs = new FileSystemAdapter();
  const logger = new ConsoleLoggerAdapter();
  const terminal = new NodeTerminalAdapter(logger);
  const ui = new TerminalUI(terminal);
  const bootstrap = new BootstrapService(fs, ui);

  console.log('Checking for new simplified methods...');
  if (
    typeof (bootstrap as any).runProviderSetup === 'function' &&
    typeof (bootstrap as any).calibrateNeuralProfiles === 'function'
  ) {
    console.log('SUCCESS: Simplified onboarding methods found.');
  } else {
    console.log('FAILURE: Missing simplified methods.');
    process.exit(1);
  }

  console.log('Verification completed.');
}

test().catch(console.error);
