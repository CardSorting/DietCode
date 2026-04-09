/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Layer classification and scanner status
 */

export interface LayerAwareness {
  declaredLayer: string;
  expectedLayer: string;
  isCompliant: boolean;
  reason: string;
  scanResult: {
    blocking: boolean;
    warnings: string[];
    suggestions: string[];
  };
}
