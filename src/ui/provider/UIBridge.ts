/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EventEmitter } from 'node:events';
import { StateOrchestrator } from '../../core/manager/StateOrchestrator';
import type { GlobalState } from '../../domain/LLMProvider';

/**
 * [LAYER: INFRASTRUCTURE / UI]
 * Central bridge for backend services to communicate with the VS Code Webview.
 * Provides a Promise-based interface for synchronous core services to await user input.
 */
export class UIBridge extends EventEmitter {
  private static instance: UIBridge;
  private pendingApprovals: Map<string, (approved: boolean) => void> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): UIBridge {
    if (!UIBridge.instance) {
      UIBridge.instance = new UIBridge();
    }
    return UIBridge.instance;
  }

  /**
   * Request approval from the user via the Webview.
   * Blocks until the user clicks Approve/Reject in the sidebar.
   */
  public async requestUserApproval(id: string, detail: any): Promise<boolean> {
    const orchestrator = StateOrchestrator.getInstance();
    
    // 1. Get current pending approvals
    const pending = (await orchestrator.getValue<any[]>('pendingToolApprovals')) || [];
    
    // 2. Add new request to state
    const updated = [...pending, { id, toolName: detail.actionType, detail }];
    
    await orchestrator.applyChange({
      key: 'pendingToolApprovals',
      newValue: updated,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => updated,
      getCorrelationId: () => `approval-req-${id}`
    }, 0);

    // 3. Update execution status
    await orchestrator.applyChange({
      key: 'executionStatus',
      newValue: 'waiting_approval',
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => 'waiting_approval',
      getCorrelationId: () => `approval-status-${id}`
    }, 0);

    return new Promise((resolve) => {
      this.pendingApprovals.set(id, resolve);

      // Timeout after 10 minutes
      setTimeout(
        () => {
          if (this.pendingApprovals.has(id)) {
            this.resolveApproval(id, false);
          }
        },
        10 * 60 * 1000,
      );
    });
  }

  /**
   * Called by SovereignWebViewProvider when the user responds.
   */
  public async resolveApproval(id: string, approved: boolean) {
    const resolver = this.pendingApprovals.get(id);
    if (resolver) {
      resolver(approved);
      this.pendingApprovals.delete(id);
    }
    
    // Cleanup state
    const orchestrator = StateOrchestrator.getInstance();
    const pending = (await orchestrator.getValue<any[]>('pendingToolApprovals')) || [];
    const updated = pending.filter(p => p.id !== id);
    
    await orchestrator.applyChange({
      key: 'pendingToolApprovals',
      newValue: updated,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => updated,
      getCorrelationId: () => `approval-resolve-${id}`
    }, 0);
    
    // Return status to executing
    await orchestrator.applyChange({
      key: 'executionStatus',
      newValue: 'executing',
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => 'executing',
      getCorrelationId: () => `approval-status-resolved-${id}`
    }, 0);
  }

  /**
   * Send a generic message to the Webview (logs, state, etc.)
   */
  public notify(type: string, payload: any) {
    this.emit('notify', { type, payload });
  }
}
