/**
 * [LAYER: DOMAIN]
 * Principle: Structural model for project-wide integrity audits
 */

import type { AxiomProfile, Violation } from './ImplementationSnapshot';

/**
 * Result of a single file integrity check
 */
export interface FileIntegrityResult {
  filePath: string;
  layer: string;
  axiomProfile: AxiomProfile;
  violations: Violation[];
}

/**
 * Comprehensive project-wide integrity report
 */
export interface ProjectIntegrityReport {
  timestamp: Date;
  totalFilesScanned: number;
  compliantFilesCount: number;
  blockedFilesCount: number;
  flaggedFilesCount: number;
  
  /**
   * Detailed results categorized by layer
   */
  resultsByLayer: Record<string, FileIntegrityResult[]>;
  
  /**
   * Critical remediation tasks derived from audit
   */
  remediationPlan: string[];
}
