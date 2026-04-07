/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

import { ViolationType } from '../memory/Integrity';

export interface IntegrityRule {
  type: ViolationType;
  pattern: RegExp;
  message: string;
  severity: 'warn' | 'error';
  layerScope?: string[];
}

export class IntegrityPolicy {
  private rules: IntegrityRule[] = [
    {
      type: ViolationType.UNAUTHORIZED_IO,
      pattern: /import.*from.*['"](fs|node:fs|path|node:path|http|https)['"]/,
      message: 'I/O imports (fs, path, http) are forbidden in the Domain layer.',
      severity: 'error',
      layerScope: ['src/domain'],
    },
    {
      type: ViolationType.CROSS_LAYER_IMPORT,
      pattern: /import.*from.*['"](.*infrastructure.*)['"]/,
      message: 'UI layer cannot import Infrastructure directly. Use Core or Domain.',
      severity: 'error',
      layerScope: ['src/ui'],
    },
    {
      type: ViolationType.CROSS_LAYER_IMPORT,
      pattern: /import.*from.*['"](.*(core|infrastructure|ui).*)['"]/,
      message: 'Domain layer cannot depend on Core, Infrastructure, or UI layers.',
      severity: 'error',
      layerScope: ['src/domain'],
    },
    {
      type: ViolationType.DOMAIN_PURITY,
      pattern: /import.*from.*['"](?!(\.|@dietcode\/|node:)).*['"]/,
      message: 'Domain layer should not depend on external libraries.',
      severity: 'warn',
      layerScope: ['src/domain'],
    },
    {
      type: ViolationType.INVALID_LAYER_TAG,
      // Target the first 500 characters only to ensure tag is in the header
      pattern:
        /^(?:[\s\S]{0,10000}?)(?!\[LAYER:\s*(DOMAIN|CORE|INFRASTRUCTURE|UI|PLUMBING|UTILS)\])/,
      message: 'Invalid or missing [LAYER] tag in the file header.',
      severity: 'error',
      layerScope: ['src/'],
    },
    {
      type: ViolationType.CROSS_LAYER_IMPORT,
      pattern: /import.*from.*['"](\.\.\/){4,}/,
      message:
        'Excessive relative import depth (level 4+) indicates potential JoyZoning violation.',
      severity: 'warn',
      layerScope: ['src/'],
    },
  ];

  getRulesForPath(filePath: string): IntegrityRule[] {
    return this.rules.filter((rule) => {
      if (!rule.layerScope) return true;
      return rule.layerScope.some((scope) => filePath.startsWith(scope));
    });
  }
}
