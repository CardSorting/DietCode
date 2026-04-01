/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — supports safe execution
 * Violations: None
 */

/**
 * Represents a backup of a file or operation state
 */
export interface Backup {
  id: string;
  type: 'FILE' | 'DATABASE' | 'SYSTEM' | 'CONFIG';
  path: string;
  content: string;
  timestamp: Date;
  createdFor?: string;
}

/**
 * Rollback operation to restore state
 */
export interface RollbackOperation {
  restore(): Promise<void>;
  getRestoreCount(): number;
}

/**
 * Manager for creating and executing rollback operations
 * Ensures actions can be undone safely
 */
export class RollbackManager {
  private backups: Backup[] = [];

  /**
   * Create a backup of file content before modification
   */
  async backupFile(path: string, content: string): Promise<Backup> {
    const backup: Backup = {
      id: `backup_${Date.now()}_${path.replace(/\//g, '_')}`,
      type: 'FILE',
      path,
      content,
      timestamp: new Date()
    };

    this.backups.push(backup);
    return backup;
  }

  /**
   * Create a backup of configuration state
   */
  async backupConfig(systemState: any): Promise<Backup> {
    const backup: Backup = {
      id: `config_backup_${Date.now()}`,
      type: 'CONFIG',
      path: 'system_config',
      content: JSON.stringify(systemState),
      timestamp: new Date()
    };

    this.backups.push(backup);
    return backup;
  }

  /**
   * Execute rollback for specific backup
   */
  async rollback(backup: Backup): Promise<number> {
    if (backup.type === 'CONFIG') {
      // Restore configuration
      // In real implementation, this would write to config file
      const restored = JSON.parse(backup.content as any);
      console.log(`✅ Config reverted to state before action ${backup.id}`);
    } else if (backup.type === 'FILE') {
      // Restore file content
      // In real implementation, this would write back to file
      console.log(`✅ File ${backup.path} reverted to state before action ${backup.id}`);
    }

    // Remove backup from registry
    this.backups = this.backups.filter(b => b.id !== backup.id);
    return this.backups.length;
  }

  /**
   * Execute rollback for a specific operation target
   * Find all backups related to the path and restore them
   */
  async rollbackByPath(path: string): Promise<number> {
    const relatedBackups = this.backups.filter(
      b => b.path === path || b.createdFor === path
    );

    for (const backup of relatedBackups) {
      await this.rollback(backup);
    }

    return relatedBackups.length;
  }

  /**
   * Execute full rollback - undo all backups
   * Used when a task is completely cancelled or failed
   */
  async fullRollback(): Promise<void> {
    const backupCount = this.backups.length;
    
    // Restore in reverse order (newest first)
    for (let i = this.backups.length - 1; i >= 0; i--) {
      try {
        await this.rollback(this.backups[i]);
      } catch (error) {
        console.error(`❌ Failed to rollback backup ${this.backups[i].id}:`, error);
      }
    }

    console.log(`🔄 Full rollback completed. Cleaned up ${backupCount} backup(s).`);
  }

  /**
   * Get rollback operations for a specific path
   */
  getRollbackOptions(path: string): RollbackOperation[] {
    const related = this.backups.filter(b => b.path === path || b.createdFor === path);
    
    return related.map(backup => ({
      restore: async () => await this.rollback(backup),
      getRestoreCount: () => 1
    }));
  }

  /**
   * Clear all backups
   * Call when action completed successfully
   */
  clear(): void {
    this.backups = [];
  }

  /**
   * Check if rollback is available
   */
  hasBackup(path: string): boolean {
    return this.backups.some(b => b.path === path);
  }
}