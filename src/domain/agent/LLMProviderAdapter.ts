/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Hardened strictly for Gemini-only infrastructure.
 */

import type { ToolDefinition } from './ToolDefinition';

/**
 * Message interface for API communication
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

/**
 * Tool call interface
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  type: 'function';
}

/**
 * Tool result interface
 */
export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

/**
 * API stream interface for streaming responses
 */
export interface ApiStream {
  [Symbol.asyncIterator](): AsyncGenerator<string>;
}

/**
 * Model information interface (USD per million tokens)
 */
export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
  supportsPromptCache: boolean;
  supportsReasoning: boolean;
  supportsStreaming: boolean;
  inputPrice?: number;
  outputPrice?: number;
  cacheReadsPrice?: number;
}

/**
 * LLM Provider Protocol
 * Consolidated for Google Gemini infrastructure.
 */
export interface LLMAdapter {
  /**
   * Create a message stream for the LLM
   */
  createMessage(system: string, messages: Message[], tools?: ToolDefinition[]): ApiStream;

  /**
   * Get metadata about this LLM model
   */
  getModelInfo(): ModelInfo;

  /**
   * Generate embeddings for semantic search (RAG support)
   */
  embedText?(text: string): Promise<number[] | never>;

  /**
   * List all available models for this provider
   */
  listModels?(): Promise<ModelInfo[]>;

  /**
   * Get maximum thinking budget
   */
  getThinkingBudgetTokenLimit(): number;

  /**
   * Get provider-specific prompt formatting strategy
   */
  getPromptStrategy(): PromptStrategy;

  /**
   * Dispose of any resources
   */
  dispose(): Promise<void>;
}

/**
 * Provider-specific prompt formatting strategy.
 * For DietCode, this is native Gemini formatting.
 */
export enum PromptStrategy {
  GEMINI = 'gemini',
}

/**
 * Configuration for adapter initialization
 */
export interface AdapterConfig {
  apiKey: string;
  apiBase?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}
