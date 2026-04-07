/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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
  MISSING_HEADER = 'missing_header',
}

export enum IntegritySeverity {
  WARN = 'warn',
  ERROR = 'error',
}

export interface IntegrityViolation {
  id: string;
  type: ViolationType;
  file: string;
  message: string;
  severity: IntegritySeverity | 'warn' | 'error';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface IntegrityReport {
  violations: IntegrityViolation[];
  scannedAt: string;
  score: number;
  fileCount?: number;
  renderCount?: number;
}
