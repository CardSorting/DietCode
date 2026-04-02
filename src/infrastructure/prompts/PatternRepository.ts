/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — connects Domain contracts with external sources
 * Violations: None
 */

import { PATTERN_REGISTRY, getAllPatterns } from '../../domain/prompts/PatternRegistry';
import type { PatternMapping } from '../../domain/prompts/SplitStrategy';

/**
 * Repository for pattern definitions
 * Reads and manages extracted patterns from the registry
 */
export class PatternRepository {
  /**
   * Get all available patterns from the registry
   */
  static getAllPatterns(): PatternMapping[] {
    return getAllPatterns();
  }

  /**
   * Get a specific pattern by name
   */
  static getPattern(name: string): PatternMapping | null {
    const pattern = PATTERN_REGISTRY.get(name);
    return pattern || null;
  }

  /**
   * Get patterns by category (safety, tooling, memory, agent)
   */
  static getPatternsByCategory(category: string): PatternMapping[] {
    return getAllPatterns().filter(p =>
      p.patternName.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Get patterns sorted by extraction complexity
   * Higher rated patterns first (safety, verification)
   */
  static getPatternsSortedByPriority(): PatternMapping[] {
    const priorityOrder: Record<string, number> = {
      safety: 100,
      verification: 90,
      tooling: 70,
      context: 40,
      agent: 60
    };

    return getAllPatterns().sort((a, b) => {
      const keyA = a.patternName.toLowerCase().split(' ')[0] ?? '';
      const keyB = b.patternName.toLowerCase().split(' ')[0] ?? '';
      const priorityA = priorityOrder[keyA] ?? 0;
      const priorityB = priorityOrder[keyB] ?? 0;
      return priorityB - priorityA;
    });
  }

  /**
   * Get patterns that need backend support (require I/O operations)
   */
  static getPatternsRequiringInfrastructure(): PatternMapping[] {
    return getAllPatterns().filter(p =>
      p.infrastructureElement !== undefined
    );
  }

  /**
   * Get patterns that provide Core layer orchestration
   */
  static getPatternsRequiringCore(): PatternMapping[] {
    return getAllPatterns().filter(p =>
      p.coreElement !== undefined
    );
  }

  /**
   * Validate that all Domain contracts have corresponding Infrastructure implementations
   */
  static validateCompleteness(): {
    valid: boolean;
    missing: Array<{ pattern: string; element: 'Domain' | 'Infrastructure' | 'Core' }>;
  } {
    const missing: Array<{ pattern: string; element: 'Domain' | 'Infrastructure' | 'Core' }> = [];
    
    for (const [name, pattern] of PATTERN_REGISTRY.entries()) {
      if (!pattern.domainElement) missing.push({ pattern: name, element: 'Domain' });
      if (!pattern.infrastructureElement) missing.push({ pattern: name, element: 'Infrastructure' });
      if (!pattern.coreElement) missing.push({ pattern: name, element: 'Core' });
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get pattern names only (for lookup purposes)
   */
  static getPatternNames(): string[] {
    return Array.from(PATTERN_REGISTRY.keys());
  }

  /**
   * Check if a pattern exists by name
   */
  static hasPattern(name: string): boolean {
    return PATTERN_REGISTRY.has(name);
  }

  /**
   * Count patterns by category
   */
  static countPatternsByCategory(): Record<string, number> {
    const counts: Record<string, number> = {
      safety: 0,
      verification: 0,
      tooling: 0,
      context: 0,
      agent: 0
    };

    for (const pattern of getAllPatterns()) {
      const category = pattern.patternName.toLowerCase().includes('safety') ? 'safety' :
                       pattern.patternName.toLowerCase().includes('verification') ? 'verification' :
                       pattern.patternName.toLowerCase().includes('tool') ? 'tooling' :
                       pattern.patternName.toLowerCase().includes('context') ? 'context' :
                       pattern.patternName.toLowerCase().includes('agent') ? 'agent' :
                       'other';

      if (counts[category] !== undefined) {
        counts[category]++;
      }
    }

    return counts;
  }
}