/**
 * [LAYER: INFRASTRUCTURE]
 * SQLite implementation of the HealingRepository using BroccoliDB.
 * Pass 10: Sovereign Healing Buffers — implements write-behind caching for remediation.
 * Zero-Wait: Tool execution never stalls for SQLite disk I/O on healing.
 */

import { SovereignDb } from './SovereignDb';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { HealingStatus, type HealingProposal } from '../../domain/healing/Healing';

export class SqliteHealingRepository implements HealingRepository {
    /**
     * Saves a healing proposal asynchronously via BufferedDbPool.
     */
    async saveProposal(proposal: HealingProposal): Promise<void> {
        const pool = await SovereignDb.getPool();
        
        await pool.push({
            type: 'insert',
            table: 'healing_proposals' as any,
            values: {
                id: proposal.id,
                violationId: proposal.violationId,
                violation: JSON.stringify(proposal.violation),
                rationale: proposal.rationale,
                proposedCode: proposal.proposedCode,
                status: proposal.status,
                createdAt: proposal.createdAt,
                appliedAt: proposal.appliedAt || null,
            } as any
        });

        // We DO NOT await flush() here. This is why it's Zero-Wait.
        // Persistence will happen in the background sequentially.
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

    /**
     * Updates the status of a proposal asynchronously.
     */
    async updateProposalStatus(id: string, status: HealingStatus): Promise<void> {
        const pool = await SovereignDb.getPool();
        
        const updateData: any = { status };
        if (status === HealingStatus.APPLIED) {
            updateData.appliedAt = new Date().toISOString();
        }
        
        await pool.push({
            type: 'update',
            table: 'healing_proposals' as any,
            values: updateData,
            where: {
                column: 'id',
                operator: '=',
                value: id
            } as any
        });
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
