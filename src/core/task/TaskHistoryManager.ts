/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Core } from '../../infrastructure/database/sovereign/Core';
import { StateOrchestrator } from '../manager/StateOrchestrator';
import type { GlobalState } from '../../domain/LLMProvider';
import { Logger } from '../../shared/services/Logger';

export interface TaskHistoryItem {
  id: string;
  timestamp: number;
  type: string;
  payload: any;
}

/**
 * [LAYER: CORE]
 * Manages retrieval and hydration of task history from Sovereign database.
 */
export class TaskHistoryManager {
  private static instance: TaskHistoryManager;

  private constructor() {}

  public static getInstance(): TaskHistoryManager {
    if (!TaskHistoryManager.instance) {
      TaskHistoryManager.instance = new TaskHistoryManager();
    }
    return TaskHistoryManager.instance;
  }

  /**
   * Fetch latest task history items from the database.
   * Maps hive_snapshots and telemetry to a unified history view.
   */
  public async getHistory(limit = 50): Promise<TaskHistoryItem[]> {
    if (!Core.isAvailable()) {
      return [];
    }

    try {
      // Fetch snapshots as history markers
      const snapshots = await Core.selectWhere('hive_snapshots', {}, undefined, {
        limit,
        orderBy: { column: 'timestamp', direction: 'desc' },
      });

      return snapshots.map((s: any) => ({
        id: s.id,
        timestamp: s.timestamp,
        type: 'checkpoint',
        payload: {
          path: s.path,
          summary: `Snapshot: ${s.id.substring(0, 8)}`,
        },
      }));
    } catch (error) {
      console.error('[History:Error] Failed to fetch task history', error);
      return [];
    }
  }

  /**
   * Sync latest history to orchestrated state
   */
  public async syncToState(limit = 10) {
    const history = await this.getHistory(limit);
    const orchestrator = StateOrchestrator.getInstance();
    
    await orchestrator.applyChange({
      key: 'taskHistorySummary',
      newValue: history,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => history,
      getCorrelationId: () => `history-sync-${Date.now()}`
    }, 0);
    
    Logger.info(`[STATE] Task history synced to state (last ${limit} items)`);
  }

  /**
   * Cleanup old history entries
   */
  public async purgeOldHistory(olderThanDays: number) {
    if (!Core.isAvailable()) return;

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    try {
      // Use push with a delete-style operation if supported, or direct SQL via db()
      const db = await Core.db();
      await (db as any)
        .deleteFrom('hive_snapshots' as any)
        .where('timestamp', '<', cutoff)
        .execute();

      console.log(`[History] Purged snapshots older than ${olderThanDays} days`);
    } catch (error) {
      console.error('[History:Error] Failed to purge history', error);
    }
  }
}
