/**
 * [LAYER: CORE]
 * Principle: Orchestrate external sync between local and remote
 * Prework Status: Not applicable (new file)
 * 
 * Coordinates bidirectional state synchronization with external services.
 * Handles conflicts, conflict resolution, and sync status tracking.
 */

import type {
  StateChange,
  StateChangeResult,
  StateChangePhase,
  RollbackStrategy,
} from '../../domain/state/StateChangeProtocol';
import type { BuildInProof } from '../../domain/system/FileMetadata';

/**
 * External sync configuration
 */
export interface ExternalSyncConfig {
  /**
   * Active external sync services
   */
  services: string[];

  /**
   * Conflict resolution strategy
   */
  conflictResolution: 'local' | 'remote' | 'auto';
}

/**
 * Sync status
 */
export enum SyncStatus {
  SYNCING = 'syncing', // Currently syncing
  IDLE = 'idle', // No sync needed
  COMMITTED = 'committed', // Changes committed successfully
  CONFLICT = 'conflict', // Conflict detected
  FAILED = 'failed', // Sync failed
  OUT_OF_SYNC = 'out_of_sync', // Local and remote have different states
}

/**
 * Sync event
 */
export interface SyncEvent {
  type: 'start' | 'complete' | 'conflict' | 'error' | 'source_change';
  service: string;
  changesCount: number;
  local?: BuildInProof;
  remote?: BuildInProof;
  error?: string;
  timestamp: number;
}

/**
 * Conflict information
 */
export interface ConflictDetails {
  key: string;
  localValue: unknown;
  remoteValue: unknown;
  timestamp: number;
  detectedAt: number;
  source: 'local' | 'remote' | 'both';
}

/**
 * ExternalSyncAdapter
 * 
 * Orchestrates bidirectional state synchronization with external services.
 * Handles conflict detection, resolution, and status tracking.
 * 
 * Key responsibilities:
 * - Sync state changes to external services
 * - Manage state conflicts between local and remote
 * - Track sync status and events
 * - Handle external source change notifications
 * - Provide conflict resolution strategies
 */
export class ExternalSyncAdapter {
  private static instance: ExternalSyncAdapter | null = null;

  private currentStatus: SyncStatus = SyncStatus.IDLE;
  private currentEvents: SyncEvent[] = [];
  private conflicts: Map<string, ConflictDetails[]> = new Map();
  private statusObservers = new Map<string, Set<(status: SyncStatus) => Promise<void>>>();
  private syncStrategy: 'local' | 'remote' | 'auto';

  private constructor(
    config: ExternalSyncConfig,
    rollbackStrategy?: RollbackStrategy
  ) {
    this.syncStrategy = config.conflictResolution;
    // rollbackStrategy would be used for conflict rollback
    console.log(`🔌 ExternalSyncAdapter initialized (strategy: ${this.syncStrategy})`);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ExternalSyncConfig): ExternalSyncAdapter {
    if (!ExternalSyncAdapter.instance) {
      ExternalSyncAdapter.instance = new ExternalSyncAdapter(
        config || {
          services: [],
          conflictResolution: 'auto',
        }
      );
    }
    return ExternalSyncAdapter.instance;
  }

  /**
   * Register status observer
   */
  registerStatusObserver(key: string, observer: (status: SyncStatus) => Promise<void>): void {
    if (!this.statusObservers.has(key)) {
      this.statusObservers.set(key, new Set());
    }
    this.statusObservers.get(key)!.add(observer);
    console.log(`✅ Status observer registered for key: ${key}`);
  }

  /**
   * Unregister status observer
   */
  unregisterStatusObserver(key: string, observer: (status: SyncStatus) => Promise<void>): void {
    this.statusObservers.get(key)?.delete(observer);
  }

  /**
   * Handle local state change (before persistence)
   */
  async onLocalChange(change: StateChange): Promise<boolean> {
    // First, sync to active services
    if (this.syncStrategy === 'local' || this.syncStrategy === 'auto') {
      try {
        await this.syncChanges([change], 'local');
      } catch (error: any) {
        console.error(`❌ Local sync failed:`, error);
        // Continue anyway
      }
    }

    return true;
  }

  /**
   * Handle remote state change (after receiving from remote)
   */
  async onRemoteChange(change: StateChange): Promise<boolean> {
    // Check for conflicts
    const conflict = await this.checkForConflict(change);
    
    if (conflict) {
      // Handle conflict
      return await this.resolveConflict(conflict);
    }

    // No conflict, accept change
    return true;
  }

  /**
   * Sync changes to external services
   */
  private async syncChanges(
    changes: StateChange[],
    source: 'local' | 'remote'
  ): Promise<SyncEvent> {
    this.updateStatus(SyncStatus.SYNCING);

    const event: SyncEvent = {
      type: 'start',
      service: 'all',
      changesCount: changes.length,
      timestamp: Date.now(),
    };

    try {
      // Get current status for proof
      event.local = await this.getCurrentStatusProof();

      // Simulate sync (would use concrete adapter in production)
      this.currentEvents.push({
        ...event,
        type: 'complete' as const,
        changesCount: changes.length,
      });

      this.updateStatus(SyncStatus.COMMITTED);
      return event;
    } catch (error: any) {
      const errorEvent: SyncEvent = {
        ...event,
        type: 'error' as const,
        error: error.message,
        timestamp: Date.now(),
      };

      this.currentEvents.push(errorEvent);
      this.updateStatus(SyncStatus.FAILED);
      return errorEvent;
    }
  }

  /**
   * Check for conflict between local and remote
   */
  private async checkForConflict(change: StateChange): Promise<ConflictDetails | null> {
    // Check if remote version exists for this key
    const remoteValue = await this.getRemoteValue(change.key);
    
    if (!remoteValue) {
      return null; // No conflict, remote doesn't have this
    }

    const conflict: ConflictDetails = {
      key: change.key,
      localValue: change.oldValue,
      remoteValue: remoteValue,
      timestamp: Date.now(),
      detectedAt: Date.now(),
      source: 'both',
    };

    // Track conflict
    this.conflicts.set(change.key, [
      ...(this.conflicts.get(change.key) || []),
      conflict,
    ]);

    return conflict;
  }

  /**
   * Resolve a conflict
   */
  private async resolveConflict(conflict: ConflictDetails): Promise<boolean> {
    // Apply conflict resolution strategy
    switch (this.syncStrategy) {
      case 'local':
        // Accept local, reject remote
        return await this.resolveLocalWins(conflict);

      case 'remote':
        // Accept remote, reject local
        return await this.resolveRemoteWins(conflict);

      case 'auto':
        // Auto-resolve based on metadata
        return await this.resolveAuto(conflict);

      default:
        return false;
    }
  }

  /**
   * Resolve: local wins
   */
  private async resolveLocalWins(conflict: ConflictDetails): Promise<boolean> {
    console.log(`⏬ Conflict resolution: local wins (${conflict.key})`);
    // Remove conflict reference
    this.conflicts.get(conflict.key)?.splice(this.conflicts.get(conflict.key)!.indexOf(conflict), 1);
    return true;
  }

  /**
   * Resolve: remote wins
   */
  private async resolveRemoteWins(conflict: ConflictDetails): Promise<boolean> {
    console.log(`⏫ Conflict resolution: remote wins (${conflict.key})`);
    // This would apply the remote value
    // Remove conflict reference
    this.conflicts.get(conflict.key)?.splice(this.conflicts.get(conflict.key)!.indexOf(conflict), 1);
    return true;
  }

  /**
   * Resolve: auto (based on timestamp)
   */
  private async resolveAuto(conflict: ConflictDetails): Promise<boolean> {
    // Use `new Date()` timestamp from the change
    const localIsNewer = Date.now() > this.getTimestamp(conflict.localValue);
    const remoteIsNewer = Date.now() > this.getTimestamp(conflict.remoteValue);

    console.log(`⚖️  Auto resolution: ${conflict.key} (local: ${localIsNewer}, remote: ${remoteIsNewer})`);

    // Accept newer change
    if (localIsNewer) {
      this.conflicts.get(conflict.key)?.splice(this.conflicts.get(conflict.key)!.indexOf(conflict), 1);
    } else {
      this.conflicts.get(conflict.key)?.splice(this.conflicts.get(conflict.key)!.indexOf(conflict), 1);
      // Apply remote value
    }

    return true;
  }

  /**
   * Get current status proof
   */
  private async getCurrentStatusProof(): Promise<BuildInProof> {
    return {
      status: this.currentStatus,
      eventsCount: this.currentEvents.length,
      conflictsCount: this.conflicts.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Get remote value for key
   */
  private async getRemoteValue(key: string): Promise<unknown> {
    // Simulate remote retrieval
    return undefined;
  }

  /**
   * Update status and notify observers
   */
  private updateStatus(newStatus: SyncStatus): void {
    if (this.currentStatus === newStatus) {
      return;
    }

    const previousStatus = this.currentStatus;
    this.currentStatus = newStatus;

    // Notify all observers
    for (const observers of this.statusObservers.values()) {
      for (const observer of observers) {
        try {
          await observer(newStatus);
        } catch (error: any) {
          console.error(`❌ Status observer error:`, error);
        }
      }
    }

    console.log(`🔄 Sync status: ${previousStatus} → ${newStatus}`);
  }

  /**
   * Get current status
   */
  getStatus(): SyncStatus {
    return this.currentStatus;
  }

  /**
   * Get sync events
   */
  getEvents(): SyncEvent[] {
    return [...this.currentEvents];
  }

  /**
   * Get conflicts
   */
  getConflicts(): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    for (const keyConflicts of this.conflicts.values()) {
      conflicts.push(...keyConflicts);
    }
    return conflicts;
  }

  /**
   * Clear all conflicts
   */
  clearConflicts(): void {
    this.conflicts.clear();
    console.log('🗑️  Conflicts cleared');
  }

  /**
   * Reset to IDLE state
   */
  reset(): void {
    this.currentStatus = SyncStatus.IDLE;
    this.currentEvents = [];
    this.conflicts.clear();
    console.log('🔄 ExternalSyncAdapter reset');
  }

  /**
   * Enable/disable specific service
   */
  toggleService(service: string, enabled: boolean): void {
    console.log(`🔌 Service ${service} set to ${enabled ? 'enabled' : 'disabled'}`);
    // Implementation would use concrete service adapters
  }

  /**
   * Get sync statistics
   */
  getStatistics(): {
    eventsCount: number;
    conflictsCount: number;
    status: SyncStatus;
    services: string[];
  } {
    return {
      eventsCount: this.currentEvents.length,
      conflictsCount: this.conflicts.size,
      status: this.currentStatus,
      services: [], // Would be populated by actual service adapters
    };
  }

  private getTimestamp(value: unknown): number {
    if (typeof value === 'object' && value !== null) {
      const date = (value as any).date;
      if (typeof date === 'number') {
        return date;
      }
      if (date instanceof Date) {
        return date.getTime();
      }
    }
    return 0;
  }
}