/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BootstrapService } from './src/core/setup/BootstrapService';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { TerminalUI } from './src/ui/terminal';

async function main() {
  const logger = new ConsoleLoggerAdapter();
  const terminalAdapter = new NodeTerminalAdapter(logger);
  const ui = new TerminalUI(terminalAdapter);
  const fs = new FileSystemAdapter();

  // Temporary backup of config
  const configPath = '.dietcode/config.json';
  const configExists = fs.exists(configPath);
  const configContent = configExists ? fs.readFile(configPath) : '';

  try {
    console.log('--- STARTING SOVEREIGN ONBOARDING (PASS 4) VERIFICATION ---');
    
    // Clear config to trigger full onboarding including personalization and theme selection
    if (configExists) {
        fs.writeFile(configPath, JSON.stringify({ name: 'Admin', onboardedAt: Date.now() }, null, 2));
        // We want to trigger theme selection too, so we'll remove aesthetic field
    }

    const bootstrap = new BootstrapService(fs, ui);
    const config = await bootstrap.bootstrap();

    console.log('\n--- VERIFICATION COMPLETED ---');
    console.log('Final Sovereign Config:', JSON.stringify(config, null, 2));

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    // Restore
    if (configExists) {
        fs.writeFile(configPath, configContent);
    }
  }
}

main().catch(console.error);
