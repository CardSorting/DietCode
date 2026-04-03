/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for checkpoint persistence.
 */
import type { ImplementationSnapshot } from './ImplementationSnapshot';

export interface IPersistenceAdapter {
  createCheckpoint(taskId: string, spec: any, allRequirements?: any[]): Promise<ImplementationSnapshot>;
  restoreCheckpoint(taskId: string, checkpointId: string): Promise<ImplementationSnapshot>;
  getLastCheckpoints(taskId: string, limit?: number): ImplementationSnapshot[];
}

/**
 * Principle: Pure interface for architectural integrity analysis.
 */
export interface IIntegrityAnalyser {
  verify(content: string, layer: string): Promise<any[]>;
  runProjectAudit(): Promise<any>;
}
