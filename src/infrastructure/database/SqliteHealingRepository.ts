import { SovereignDb } from './SovereignDb';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { HealingStatus, type HealingProposal } from '../../domain/healing/Healing';

/**
 * [LAYER: INFRASTRUCTURE]
 * SQLite implementation of the HealingRepository using BroccoliDB.
 */
export class SqliteHealingRepository implements HealingRepository {
  async saveProposal(proposal: HealingProposal): Promise<void> {
    const db = await SovereignDb.db();
    await db.insertInto('healing_proposals' as any)
      .values({
        id: proposal.id,
        violationId: proposal.violationId,
        violation: JSON.stringify(proposal.violation),
        rationale: proposal.rationale,
        proposedCode: proposal.proposedCode,
        status: proposal.status,
        createdAt: proposal.createdAt,
        appliedAt: proposal.appliedAt || null,
      } as any)
      .execute();
  }

  async getProposalById(id: string): Promise<HealingProposal | null> {
    const db = await SovereignDb.db();
    const row = await db.selectFrom('healing_proposals' as any)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) return null;
    return this.mapRowToProposal(row);
  }

  async getProposalsForViolation(violationId: string): Promise<HealingProposal[]> {
    const db = await SovereignDb.db();
    const rows = await db.selectFrom('healing_proposals' as any)
      .selectAll()
      .where('violationId', '=', violationId)
      .execute();

    return rows.map(row => this.mapRowToProposal(row));
  }

  async updateProposalStatus(id: string, status: HealingStatus): Promise<void> {
    const db = await SovereignDb.db();
    const updateData: any = { status };
    if (status === HealingStatus.APPLIED) {
        updateData.appliedAt = new Date().toISOString();
    }
    
    await db.updateTable('healing_proposals' as any)
      .set(updateData)
      .where('id', '=', id)
      .execute();
  }

  async listRecentProposals(limit: number = 10): Promise<HealingProposal[]> {
    const db = await SovereignDb.db();
    const rows = await db.selectFrom('healing_proposals' as any)
      .selectAll()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .execute();

    return rows.map(row => this.mapRowToProposal(row));
  }

  private mapRowToProposal(row: any): HealingProposal {
    return {
      id: row.id,
      violationId: row.violationId,
      violation: JSON.parse(row.violation),
      rationale: row.rationale,
      proposedCode: row.proposedCode,
      status: row.status as HealingStatus,
      createdAt: row.createdAt,
      appliedAt: row.appliedAt,
    };
  }
}
