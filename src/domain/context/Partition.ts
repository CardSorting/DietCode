/**
 * [LAYER: DOMAIN]
 * Standardized types for cognitive partitioning and context silos.
 */

export enum PartitionType {
  GLOBAL = 'global', // Shared across all projects (User preferences, global rules)
  PROJECT = 'project', // Specific to a codebase (Arch rules, project context)
  SESSION = 'session', // Specific to a single interaction (Current task, recent events)
}

export interface ContextPartition {
  type: PartitionType;
  key: string;
  data: Record<string, any>;
  lastUpdated: string;
}

export interface CognitiveState {
  partitions: Map<PartitionType, ContextPartition>;
  activeFocus: PartitionType;
}
