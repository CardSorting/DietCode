/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { StateObserver, StateChangeResult } from '../../domain/state/StateChangeProtocol';
import { StateOrchestrator } from './StateOrchestrator';
import { Logger } from '../../shared/services/Logger';

/**
 * [LAYER: CORE / MANAGER]
 * Orchestrates real-time synchronization between the backend state and all active UI streams.
 * Acts as a hub for pushing state changes to gRPC listeners.
 */
export class StateSyncService implements StateObserver {
  private static instance: StateSyncService;
  private listeners: Map<string, (stateJson: string) => void> = new Map();

  private constructor() {
    StateOrchestrator.getInstance().registerGlobalObserver(this);
    Logger.info('[STATE] StateSyncService initialized and registered as global observer');
  }

  public static getInstance(): StateSyncService {
    if (!StateSyncService.instance) {
      StateSyncService.instance = new StateSyncService();
    }
    return StateSyncService.instance;
  }

  /**
   * Subscribe a new gRPC stream to state changes
   * @param id Unique ID for the stream
   * @param pushCallback Callback to push the state JSON
   * @returns Unsubscribe function
   */
  public subscribe(id: string, pushCallback: (stateJson: string) => void): () => void {
    this.listeners.set(id, pushCallback);
    
    // Push initial state immediately
    this._broadcastToListener(id);
    
    Logger.info(`[STATE] New gRPC state subscription established: ${id}`);
    
    return () => {
      this.listeners.delete(id);
      Logger.info(`[STATE] gRPC state subscription terminated: ${id}`);
    };
  }

  /**
   * Called when ANY state key changes in the orchestrator
   */
  public async onChange(result: StateChangeResult<any>): Promise<void> {
    if (!result.success) return;
    
    Logger.info(`[STATE] Broadcasting state change for key: ${result.change.key}`);
    await this.broadcast();
  }

  /**
   * Broadcast the latest state to all listeners
   */
  public async broadcast(): Promise<void> {
    const snapshot = await StateOrchestrator.getInstance().getStateSnapshot();
    const stateJson = JSON.stringify(snapshot);
    
    for (const [id, push] of this.listeners.entries()) {
      try {
        push(stateJson);
      } catch (error) {
        Logger.error(`[STATE] Failed to push state to listener ${id}:`, error);
        this.listeners.delete(id); // Cleanup dead listener
      }
    }
  }

  /**
   * Internal helper to broadcast a snapshot to a specific listener
   */
  private async _broadcastToListener(id: string): Promise<void> {
    const push = this.listeners.get(id);
    if (!push) return;
    
    const snapshot = await StateOrchestrator.getInstance().getStateSnapshot();
    const stateJson = JSON.stringify(snapshot);
    push(stateJson);
  }
}
