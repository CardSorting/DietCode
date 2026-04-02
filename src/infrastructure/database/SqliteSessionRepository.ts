/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of SessionRepository using BroccoliDB.
 */

import { SovereignDb } from './SovereignDb';
import type { SessionRepository } from '../../domain/context/SessionRepository';
import type { Message, SessionState } from '../../domain/context/SessionState';
import type { ProjectContext } from '../../domain/context/ProjectContext';

export class SqliteSessionRepository implements SessionRepository {
  /**
   * Deep Integration: Ensures the workspace and repository exist in BroccoliDB.
   */
  async ensureProject(context: ProjectContext, userId: string): Promise<void> {
    const pool = await SovereignDb.getPool();
    const now = Date.now();

    // 1. Ensure Workspace
    await pool.push({
      type: 'upsert',
      table: 'workspaces',
      values: {
        id: context.workspace.id,
        userId: userId,
        createdAt: now,
      } as any,
      conflictTarget: 'id',
    });

    // 2. Ensure Repository
    await pool.push({
      type: 'upsert',
      table: 'repositories',
      values: {
        id: context.repository.id,
        workspaceId: context.workspace.id,
        repoId: context.repository.id,
        repoPath: context.repository.path,
        defaultBranch: context.repository.defaultBranch,
        createdAt: now,
      } as any,
      conflictTarget: 'id',
    });
    
    await pool.flush();
  }

  async createSession(userId: string, agentId: string, description: string): Promise<string> {
    const pool = await SovereignDb.getPool();
    const sessionId = globalThis.crypto.randomUUID();
    const now = Date.now();

    // Ensure user and agent exist in the Hive
    await pool.push({
      type: 'insert',
      table: 'users',
      values: { id: userId, createdAt: now },
      conflictTarget: 'id',
    } as any);

    await pool.push({
      type: 'insert',
      table: 'agents',
      values: { 
        id: agentId, 
        userId: userId, 
        name: 'DietCode', 
        role: 'Assistant',
        createdAt: now,
        lastActive: now 
      },
      conflictTarget: 'id',
    } as any);

    await pool.push({
      type: 'insert',
      table: 'tasks',
      values: {
        id: sessionId,
        userId: userId,
        agentId: agentId,
        status: 'pending',
        description: description,
        createdAt: now,
        updatedAt: now,
      } as any
    });

    await pool.flush();
    return sessionId;
  }

  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const pool = await SovereignDb.getPool();
    const db = await SovereignDb.db(); // Need direct read for session info
    const eventId = globalThis.crypto.randomUUID();
    const now = Date.now();

    const session = await db.selectFrom('tasks' as any)
      .select(['userId', 'agentId'])
      .where('id', '=', sessionId)
      .executeTakeFirst() as any;

    if (!session) throw new Error(`Session ${sessionId} not found`);

    await pool.push({
      type: 'insert',
      table: 'audit_events',
      values: {
        id: eventId,
        userId: session.userId,
        agentId: session.agentId,
        type: 'session_message',
        data: JSON.stringify({
          taskId: sessionId,
          message: message
        }),
        createdAt: now,
      } as any
    });
      
    await pool.push({
      type: 'update',
      table: 'tasks',
      values: { updatedAt: now },
      where: { column: 'id', value: sessionId } as any,
    });
  }

  async loadSession(sessionId: string): Promise<SessionState | null> {
    const db = await SovereignDb.db();
    
    const task = await db.selectFrom('tasks' as any)
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst() as any;

    if (!task) return null;

    const events = await db.selectFrom('audit_events' as any)
      .selectAll()
      .where('type', '=', 'session_message')
      .where('data', 'like', `%${sessionId}%`)
      .orderBy('createdAt', 'asc')
      .execute() as any[];

    const messages: Message[] = [];
    for (const event of events) {
      const data = JSON.parse(event.data);
      if (data.taskId === sessionId) {
        messages.push(data.message);
      }
    }

    return {
      conversationId: sessionId,
      messages,
      systemPrompt: 'You are DietCode, a minimalist coding assistant.',
      metadata: { sessionId },
    };
  }

  async updateSessionStatus(sessionId: string, status: string, result?: any): Promise<void> {
    const pool = await SovereignDb.getPool();
    const now = Date.now();

    await pool.push({
      type: 'update',
      table: 'tasks',
      values: { 
        status, 
        result: result ? JSON.stringify(result) : null,
        updatedAt: now 
      } as any,
      where: { column: 'id', value: sessionId } as any,
    });
  }

  /**
   * Gets a session by ID (alias for loadSession).
   */
  async getSession(sessionId: string): Promise<SessionState | null> {
    return this.loadSession(sessionId);
  }

  async updateSessionAgent(sessionId: string, agentId: string): Promise<void> {
    const pool = await SovereignDb.getPool();
    const now = Date.now();

    await pool.push({
      type: 'update',
      table: 'tasks',
      values: { 
        agentId, 
        updatedAt: now 
      } as any,
      where: { column: 'id', value: sessionId } as any,
    });
    
    await pool.flush();
  }
}
