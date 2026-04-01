/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, domain models, value objects
 * Violations: None
 * 
 * Shared domain types for context compression functionality.
 */

/**
 * Session identifier
 */
export type SessionId = string;

/**
 * Message role in conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * Message content structure
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Partial message for context operations
 */
export type PartialMessage = Omit<Message, 'timestamp' | 'metadata'>;

/**
 * User session context encapsulation
 */
export interface SessionContext {
  sessionId: SessionId;
  messages: Message[];
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
  isActive: boolean;
}

/**
 * Conversation flow state
 */
export interface ConversationState {
  sessionId: SessionId;
  userIntent?: string;
  currentTask?: string;
  stage: 'INIT' | 'ANALYZING' | 'EXECUTING' | 'REVIEWING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
  errorCount: number;
  decisionCount: number;
}

/**
 * Context modification record
 */
export interface ContextModification {
  operationType: 'APPEND' | 'MERGE' | 'COMPRESS' | 'PURGE' | 'UPDATE';
  timestamp: Date;
  affectedMessages: number;
  reason?: string;
}

/**
 * Context statistics
 */
export interface ContextStatistics {
  totalMessages: number;
  totalTokens: number;
  averageMessageLength: number;
  peakContextLength: number;
  compressionHistory: number[]; // timestamps when compression occurred
  errorHistory: Array<{ timestamp: Date; errorId: string }>;
  userEngagementScore: number;
}