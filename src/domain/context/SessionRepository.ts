/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Interface for session persistence.
 */

import type { ProjectContext } from './ProjectContext';
import type { Message, SessionState } from './SessionState';

export interface SessionRepository {
  /**
   * Deep Integration: Ensures the workspace and repository exist in BroccoliDB.
   */
  ensureProject(context: ProjectContext, userId: string): Promise<void>;

  /**
   * Creates a new session (task) in the database.
   */
  createSession(userId: string, agentId: string, description: string): Promise<string>;

  /**
   * Appends a message to the session history.
   */
  appendMessage(sessionId: string, message: Message): Promise<void>;

  /**
   * Loads the session history.
   */
  loadSession(sessionId: string): Promise<SessionState | null>;

  /**
   * Updates the status of a session.
   */
  updateSessionStatus(sessionId: string, status: string, result?: any): Promise<void>;

  /**
   * Triple Down: Swarm Handover.
   * Updates the active agent for a session.
   */
  updateSessionAgent(sessionId: string, agentId: string): Promise<void>;

  /**
   * Gets a session by ID
   */
  getSession(sessionId: string): Promise<SessionState | null>;
}
