/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for risk assessment and safety categorization
 */

import type { PromptAudit } from './PromptAudit';
import type { PromptDefinition } from './PromptCategory';

/**
 * Risk tier classification for prompt executions
 */
export enum RiskTier {
  /** Safe operations: local, reversible, no sensitive data */
  LOW = 'low',
  /** Moderate risk: shared paths, moderate impact, recoverable */
  MEDIUM = 'medium',
  /** High risk: production data, destructive commands */
  HIGH = 'high',
}

/**
 * Required safety safeguards based on risk tier
 */
export interface SafetySafeguard {
  type: 'approval' | 'backup' | 'testing' | 'rollback' | 'isolation';
  description: string;
  required: boolean;
}

/**
 * Inferred risk factors from operational context
 */
export interface RiskFactor {
  factor: 'scope' | 'sensitivity' | 'reversibility' | 'data_affected' | 'system_impact';
  value: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Complete risk assessment for a prompt execution
 */
export interface RiskProfile {
  promptId: string;
  tier: RiskTier;
  safeguarding: SafetySafeguard[];
  factors: RiskFactor[];
  assumptions: string[];
  recommended_tools?: string[];
  escalation_stage: 'before_tool' | 'after_tool' | 'on_failure';
}

/**
 * Risk assessment result from assessment engine
 */
export interface RiskAssessmentResult {
  profile: RiskProfile;
  confidence: number; // 0.0 to 1.0
  reasoning: string[];
  mitigations: string[];
  passed: boolean; // Should we proceed?
}

/**
 * Determines safety safeguard requirements based on risk tier
 */
export class SafeguardFactory {
  static getSafeguardsForTier(tier: RiskTier): SafetySafeguard[] {
    switch (tier) {
      case RiskTier.LOW:
        return [
          {
            type: 'testing',
            description: 'Run basic checks on changed behavior',
            required: true,
          },
        ];

      case RiskTier.MEDIUM:
        return [
          {
            type: 'testing',
            description: 'Run comprehensive tests for modified paths',
            required: true,
          },
          {
            type: 'rollback',
            description: 'Prepare rollback script for idempotency',
            required: true,
          },
        ];

      case RiskTier.HIGH:
        return [
          {
            type: 'approval',
            description: 'User confirmation required before execution',
            required: true,
          },
          {
            type: 'backup',
            description: 'Backup affected production systems',
            required: true,
          },
          {
            type: 'testing',
            description: 'Run full test suite with integration tests',
            required: true,
          },
          {
            type: 'rollback',
            description: 'Execute rollback plan if verification fails',
            required: true,
          },
          {
            type: 'isolation',
            description: 'Run in isolated environment/sandbox',
            required: true,
          },
        ];

      default:
        return [];
    }
  }

  static getEscalationStage(tier: RiskTier): RiskProfile['escalation_stage'] {
    switch (tier) {
      case RiskTier.LOW:
        return 'before_tool';
      case RiskTier.MEDIUM:
        return 'after_tool';
      case RiskTier.HIGH:
        return 'on_failure';
      default:
        return 'before_tool';
    }
  }
}
