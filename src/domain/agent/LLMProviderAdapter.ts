/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, no external I/O
 * Prework Status: Not applicable (new file, > 300 LOC)
 *
 * Defines the domain contract for LLM provider adapters.
 * Supports dialect-specific behavior, thinking budgets, and caching.
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
 * Model information interface
 */
export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
  supportsPromptCache: boolean;
  supportsReasoning: boolean;
  supportsStreaming: boolean;
  costPerThousandTokens?: Record<string, number>; // USD
}

/**
 * LLM Provider Protocol
 *
 * Defines the abstract contract that all LLM adapters must implement.
 * This allows DietCode to support 40+ providers (Anthropic, OpenAI, OpenRouter, etc.)
 * through provider-specific implementations.
 */
export interface LLMAdapter {
  /**
   * Create a message stream for the LLM
   *
   * @param system - System prompt and policy constraints
   * @param messages - Conversation history including user/assistant/tool calls
   * @param tools - Optional tools available to the LLM
   * @returns Async stream of text chunks
   */
  createMessage(system: string, messages: Message[], tools?: ToolDefinition[]): ApiStream;

  /**
   * Get metadata about this LLM model
   */
  getModelInfo(): ModelInfo;

  /**
   * Generate embeddings for semantic search (RAG support)
   *
   * @param text - Text to embed
   * @returns Vector array [dimension1, dimension2, ...]
   * @throws Error if provider doesn't support embeddings
   */
  embedText?(text: string): Promise<number[] | never>;

  /**
   * Get maximum thinking budget (unused token allocation)
   *
   * @returns Maximum number of tokens for reasoning/thinking steps
   */
  getThinkingBudgetTokenLimit(): number;

  /**
   * Get provider-specific prompt formatting strategy
   *
   * Some providers require special formatting for tools, system prompts, etc.
   */
  getPromptStrategy(): PromptStrategy;
}

/**
 * Provider-specific prompt formatting strategy
 */
export enum PromptStrategy {
  NATIVE = 'native', // Provider-specific natural formatting
  ANTHROPIC_V0 = 'anthropic_v0', // Anthropic 0.x style
  OPENAI = 'openai', // OpenAI-compatible style
  OPENROUTER = 'openrouter', // OpenRouter-specific formatting
  COHERE = 'cohere', // Cohere-specific formatting
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
