/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type HealingProposal, HealingStatus } from '../../domain/healing/Healing';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { Core } from './sovereign/Core';

/**
 * SQLite implementation of the HealingRepository using BroccoliQ Hive.
 * Utilizes Write-Behind architecture for zero-latency remediation tracking.
 */
export class SqliteHealingRepository implements HealingRepository {
  async saveProposal(proposal: HealingProposal): Promise<void> {
    // 2.0 Architectural Pattern: Zero-Wait ingestion
    await Core.push({
      type: 'insert',
      table: 'hive_healing_proposals',
      values: {
        id: proposal.id,
        violationId: proposal.violationId,
        violation: JSON.stringify(proposal.violation),
        rationale: proposal.rationale,
        proposedCode: proposal.proposedCode,
        status: proposal.status,
        confidence: proposal.confidence,
        createdAt: proposal.createdAt,
        appliedAt: proposal.appliedAt || null,
      },
    });
  }

  async getProposalById(id: string): Promise<HealingProposal | null> {
    const results = await Core.selectWhere(
      'hive_healing_proposals',
      { column: 'id', operator: '=', value: id },
      undefined,
      { limit: 1 },
    );

    if (!results[0]) return null;
    return this.mapRowToProposal(results[0]);
  }

  async getProposalsForViolation(violationId: string): Promise<HealingProposal[]> {
    const results = await Core.selectWhere('hive_healing_proposals', {
      column: 'violationId',
      operator: '=',
      value: violationId,
    });

    return results.map((row: any) => this.mapRowToProposal(row));
  }

  async updateProposalStatus(id: string, status: HealingStatus): Promise<void> {
    const updateData: any = { status };
    if (status === HealingStatus.APPLIED) {
      updateData.appliedAt = new Date().toISOString();
    }

    await Core.push({
      type: 'update',
      table: 'hive_healing_proposals',
      values: updateData,
      where: {
        column: 'id',
        operator: '=',
        value: id,
      },
    });
  }

  async listRecentProposals(limit = 10): Promise<HealingProposal[]> {
    const results = await Core.selectWhere('hive_healing_proposals', [], undefined, {
      orderBy: { column: 'createdAt', direction: 'desc' },
      limit,
    });

    return results.map((row: any) => this.mapRowToProposal(row));
  }

  private mapRowToProposal(row: any): HealingProposal {
    return {
      id: row.id,
      violationId: row.violationId,
      violation: JSON.parse(row.violation),
      rationale: row.rationale,
      proposedCode: row.proposedCode,
      status: row.status as HealingStatus,
      confidence: row.confidence || 0.5,
      createdAt: row.createdAt,
      appliedAt: row.appliedAt,
    };
  }
}
