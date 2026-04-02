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
  score: number; // 0-100
  violations: IntegrityViolation[];
  scannedAt: string;
  fileCount?: number;
  renderCount?: number;
}
