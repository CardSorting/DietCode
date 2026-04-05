import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { SessionRepository } from '../../domain/context/SessionRepository';
import type { Message, SessionState } from '../../domain/context/SessionState';
import { Core } from './sovereign/Core';

/**
 * [LAYER: INFRASTRUCTURE]
 * Implementation of SessionRepository using BroccoliQ Hive.
 * Manages project, agent, and task state with high-throughput write-ahead logs.
 */
export class SqliteSessionRepository implements SessionRepository {
  /**
   * Deep Integration: Ensures the workspace and repository exist in BroccoliQ.
   */
  async ensureProject(context: ProjectContext, userId: string): Promise<void> {
    const now = Date.now();

    // 1. Ensure Workspace
    await Core.push({
      type: 'upsert',
      table: 'workspaces',
      values: {
        id: context.workspace.id,
        userId: userId,
        createdAt: now,
      },
      conflictTarget: 'id',
    });

    // 2. Ensure Repository
    await Core.push({
      type: 'upsert',
      table: 'repositories',
      values: {
        id: context.repository.id,
        workspaceId: context.workspace.id,
        repoId: context.repository.id,
        repoPath: context.repository.path,
        defaultBranch: context.repository.defaultBranch,
        createdAt: now,
      },
      conflictTarget: 'id',
    });

    await Core.flush();
  }

  async createSession(userId: string, agentId: string, description: string): Promise<string> {
    const sessionId = globalThis.crypto.randomUUID();
    const now = Date.now();

    // Ensure user and agent exist in the Hive
    await Core.push({
      type: 'insert',
      table: 'users',
      values: { id: userId, createdAt: now },
      conflictTarget: 'id',
    });

    await Core.push({
      type: 'insert',
      table: 'agents',
      values: {
        id: agentId,
        userId: userId,
        name: 'DietCode',
        role: 'Assistant',
        createdAt: now,
        lastActive: now,
      },
      conflictTarget: 'id',
    });

    await Core.push({
      type: 'insert',
      table: 'hive_tasks',
      values: {
        id: sessionId,
        userId: userId,
        agentId: agentId,
        status: 'pending',
        description: description,
        createdAt: now,
        updatedAt: now,
      },
    });

    await Core.flush();
    return sessionId;
  }

  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const now = Date.now();

    // Fluid Read: Get session context
    const results = await Core.selectWhere(
      'hive_tasks',
      { column: 'id', operator: '=', value: sessionId },
      undefined,
      { limit: 1 },
    );
    const session = results[0] as any;

    if (!session) throw new Error(`Session ${sessionId} not found`);

    await Core.push({
      type: 'insert',
      table: 'hive_audit',
      values: {
        id: globalThis.crypto.randomUUID(),
        userId: session.userId,
        agentId: session.agentId,
        type: 'session_message',
        data: JSON.stringify({
          taskId: sessionId,
          message: message,
        }),
        createdAt: now,
      },
    });

    await Core.push({
      type: 'update',
      table: 'hive_tasks',
      values: { updatedAt: now },
      where: { column: 'id', operator: '=', value: sessionId },
    });
  }

  async loadSession(sessionId: string): Promise<SessionState | null> {
    // 1. Get task state
    const taskResults = await Core.selectWhere(
      'hive_tasks',
      { column: 'id', operator: '=', value: sessionId },
      undefined,
      { limit: 1 },
    );
    const task = taskResults[0] as any;

    if (!task) return null;

    // 2. Get session messages from audit events
    const eventResults = await Core.selectWhere(
      'hive_audit',
      [
        { column: 'type', operator: '=', value: 'session_message' },
        { column: 'data', operator: 'LIKE', value: `%${sessionId}%` },
      ],
      undefined,
      { orderBy: { column: 'timestamp', direction: 'asc' } },
    );

    const messages: Message[] = [];
    for (const event of eventResults as any[]) {
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
    const now = Date.now();

    await Core.push({
      type: 'update',
      table: 'hive_tasks',
      values: {
        status,
        result: result ? JSON.stringify(result) : null,
        updatedAt: now,
      },
      where: { column: 'id', operator: '=', value: sessionId },
    });
  }

  async getSession(sessionId: string): Promise<SessionState | null> {
    return this.loadSession(sessionId);
  }

  async updateSessionAgent(sessionId: string, agentId: string): Promise<void> {
    const now = Date.now();

    await Core.push({
      type: 'update',
      table: 'hive_tasks',
      values: {
        agentId,
        updatedAt: now,
      },
      where: { column: 'id', operator: '=', value: sessionId },
    });

    await Core.flush();
  }
}
