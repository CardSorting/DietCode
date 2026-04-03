/**
 * [LAYER: DOMAIN]
 * Standardized integrity and architectural guarding types.
 */

export enum ViolationType {
  IMMUTABILITY_BREACH = 'immutability_breach',
  CROSS_LAYER_IMPORT = 'cross_layer_import',
  UNAUTHORIZED_IO = 'unauthorized_io',
  SENSITIVE_LEAK = 'sensitive_leak',
  NAMING_CONVENTION = 'naming_convention',
  DOMAIN_PURITY = 'domain_purity',
  INVALID_LAYER_TAG = 'invalid_layer_tag',
  MISPLACED_FILE = 'misplaced_file',
  MISSING_TAG = 'missing_tag',
  LAYER_VIOLATION = 'layer_violation',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  TAG_DRIFT = 'tag_drift',
}

export interface IntegrityViolation {
  id: string;
  type: ViolationType;
  file: string;
  message: string;
  severity: 'warn' | 'error';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface IntegrityReport {
  violations: IntegrityViolation[];
  scannedAt: string;
  fileCount?: number;
  renderCount?: number;
}
