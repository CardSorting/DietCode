/**
 * [LAYER: DOMAIN]
 * Standardized self-healing and refactoring proposal types.
 */

import type { IntegrityViolation } from '../memory/Integrity';

export enum HealingStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export interface HealingProposal {
  id: string;
  violationId: string;
  violation: IntegrityViolation;
  rationale: string;
  proposedCode: string;
  status: HealingStatus;
  createdAt: string;
  appliedAt?: string;
}

export interface HealingTask {
  id: string;
  violationId: string;
  targetFile: string;
  specialistId: string; // The agent ID assigned to heal this
}
