/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Architectural Discovery Results
 */

export interface DiscoveryResult {
  pattern: string;
  files: string[];
  confidence: number;
}
