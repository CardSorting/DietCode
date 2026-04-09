/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { HealingProposal, HealingStatus } from './Healing';

/**
 * [LAYER: DOMAIN]
 * Interface for persisting and querying architectural healing proposals.
 */
export interface HealingRepository {
  /**
   * Saves a new healing proposal.
   */
  saveProposal(proposal: HealingProposal): Promise<void>;

  /**
   * Retrieves a healing proposal by its ID.
   */
  getProposalById(id: string): Promise<HealingProposal | null>;

  /**
   * Retrieves all proposals for a specific integrity violation.
   */
  getProposalsForViolation(violationId: string): Promise<HealingProposal[]>;

  /**
   * Updates the status of an existing proposal.
   */
  updateProposalStatus(id: string, status: HealingStatus): Promise<void>;

  /**
   * Lists recent proposals with an optional limit.
   */
  listRecentProposals(limit?: number): Promise<HealingProposal[]>;
}
