/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Core } from './infrastructure/database/sovereign/Core';
import { SovereignWebViewProvider } from './ui/provider/SovereignWebViewProvider';
import { ProviderStateManager } from './core/manager/ProviderStateManager';
import { VsCodeStateRepository } from './infrastructure/storage/VsCodeStateRepository';

/**
 * [LAYER: INFRASTRUCTURE / VSCODE]
 * Extension entry point.
 *
 * CRITICAL: Core.init() must be called eagerly here because broccoliq's
 * dbPool singleton starts its SqliteQueue worker on first import. Without
 * an early setDbPath(), the worker falls back to process.cwd() which is
 * unwritable inside the Electron extension host — causing
 * "unable to open database file" errors.
 *
 * We use context.globalStorageUri (a VS Code-provided writable directory)
 * instead of extensionPath (which may be read-only).
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('DietCode "Sovereign Hive" Extension Activated');

  // Ensure writable storage directory exists and initialize the database early
  const storagePath = context.globalStorageUri.fsPath;
  const dbPath = path.join(storagePath, 'broccoliq.db');

  try {
    await Core.init(dbPath);
    console.log(`[DietCode] Sovereign Hive DB initialized at: ${dbPath}`);
  } catch (err) {
    console.error('[DietCode] Failed to initialize Sovereign Hive DB:', err);
    // Non-fatal: extension can still activate, DB features will fail gracefully
  }

  // Initialize infrastructure repositories
  VsCodeStateRepository.getInstance().initialize(context);

  // Initialize Provider State Management
  ProviderStateManager.getInstance().initialize();

  const provider = new SovereignWebViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SovereignWebViewProvider.viewType, provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dietcode.openWebView', () => {
      vscode.commands.executeCommand('workbench.view.extension.dietcode-explorer');
    }),
  );
}

export async function deactivate() {
  try {
    // Flush all debounced state changes to avoid data loss
    await StateOrchestrator.getInstance().forceFlush();
    await Core.flush();
    console.log('[DietCode] Sovereign Hive deactivated and state flushed.');
  } catch (_) {
    // Best-effort cleanup
  }
}
