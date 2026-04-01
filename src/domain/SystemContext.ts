/**
 * [LAYER: DOMAIN]
 * Principle: Pure model representing the workspace environment.
 */

export interface ExtensionStat {
  extension: string;
  count: number;
  percentage: string;
}

export interface Extension {
  stats: ExtensionStat[];
  totalFiles: number;
}

export interface SystemContext {
  cwd: string;
  filesSummary: Extension;
  activeBranch?: string;
  availableSkills: string[];
  toolsEnabled: boolean;
}
