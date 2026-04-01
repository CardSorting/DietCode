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
      layerScope: ['src/domain']
    },
    {
      type: ViolationType.CROSS_LAYER_IMPORT,
      pattern: /import.*from.*['"](.*infrastructure.*)['"]/,
      message: 'UI layer cannot import Infrastructure directly. Use Core or Domain.',
      severity: 'error',
      layerScope: ['src/ui']
    },
    {
      type: ViolationType.CROSS_LAYER_IMPORT,
      pattern: /import.*from.*['"](.*(core|infrastructure|ui).*)['"]/,
      message: 'Domain layer cannot depend on Core, Infrastructure, or UI layers.',
      severity: 'error',
      layerScope: ['src/domain']
    },
    {
      type: ViolationType.DOMAIN_PURITY,
      pattern: /import.*from.*['"](?!(\.|@dietcode\/|node:)).*['"]/,
      message: 'Domain layer should not depend on external libraries.',
      severity: 'warn',
      layerScope: ['src/domain']
    }
  ];

  getRulesForPath(filePath: string): IntegrityRule[] {
    return this.rules.filter(rule => {
      if (!rule.layerScope) return true;
      return rule.layerScope.some(scope => filePath.startsWith(scope));
    });
  }
}
