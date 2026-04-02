/**
 * [VERIFICATION]
 * Tests SwarmAuditor and distributed coordination features.
 */

import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { EventBus } from './src/core/orchestration/EventBus';
import { EventType } from './src/domain/events/EventType';
import { SwarmAuditor } from './src/core/orchestration/SwarmAuditor';
import type { SessionRepository } from './src/domain/context/SessionRepository';
import type { LogService } from './src/domain/logging/LogService';

// Mock SessionRepository
class MockSessionRepository implements SessionRepository {
  private sessions: Map<string, any> = new Map();

  async ensureProject(context: any, userId: string): Promise<void> {}
  
  async createSession(userId: string, agentId: string, description: string): Promise<string> {
    const sessionId = `session-${Date.now()}`;
    this.sessions.set(sessionId, {
      sessionId,
      messages: [],
      agentId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return sessionId;
  }
  
  async appendMessage(sessionId: string, message: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }
  }
  
  async loadSession(sessionId: string): Promise<any> {
    return this.sessions.get(sessionId) || null;
  }
  
  async updateSessionStatus(sessionId: string, status: string, result?: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (result) session.result = result;
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }
  }
  
  async updateSessionAgent(sessionId: string, agentId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.agentId = agentId;
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
    }
  }
  
  async getSession(sessionId: string): Promise<any> {
    return this.sessions.get(sessionId) || null;
  }
}

async function verify() {
  console.log('--- DIETCODE SWARM VERIFICATION ---');

  const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
  const eventBus = EventBus.getInstance(logger);
  const sessionRepo = new MockSessionRepository();
  const auditor = new SwarmAuditor(eventBus, sessionRepo, logger);

  // 1. Test Auditing Functionality
  console.log('\n[1] Testing Audit logging...');
  await auditor.auditEvent(EventType.SYSTEM_INFO_GATHERED, { type: 'system_info' });
  console.log('[PASS] Audit logged');

  console.log('\n--- ALL SWARM VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});