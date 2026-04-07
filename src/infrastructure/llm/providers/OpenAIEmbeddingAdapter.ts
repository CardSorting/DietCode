/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: OpenAI embedding provider implementation
 * Prework Status: Not applicable (new file)
 *
 * Implements the EmbeddingService interface for OpenAI embeddings.
 * Supports the text-embedding-3-small and text-embedding-3-large models.
 */

import { OpenAI } from 'openai';
import type { EmbeddingService } from '../../../domain/agent/EmbeddingService';
import type {
  ApiStream,
  LLMAdapter,
  Message,
  ModelInfo,
} from '../../../domain/agent/LLMProviderAdapter';
import { PromptStrategy } from '../../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';

/**
 * OpenAI Embedding Adapter configuration
 */
export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  organizationId?: string;
  timeoutMs?: number;
}

/**
 * OpenAI Embedding Adapter
 *
 * Generates embeddings using OpenAI's embedding models.
 * Supports batch generation for efficiency and rate limit adherence.
 *
 * Implements both EmbeddingService for RAG and LLMAdapter for the registry.
 */
export class OpenAIEmbeddingAdapter implements EmbeddingService, LLMAdapter {
  private client: OpenAI;
  private model: string;
  private dimension: number;

  constructor(config: OpenAIEmbeddingConfig) {
    this.model = config.model;

    const openaiConfig: any = {
      apiKey: config.apiKey,
      organization: config.organizationId,
      timeout: config.timeoutMs || 30000,
    };

    this.client = new OpenAI(openaiConfig);

    // Set dimension based on model
    switch (this.model) {
      case 'text-embedding-3-small':
        this.dimension = 1536;
        break;
      case 'text-embedding-3-large':
        this.dimension = 3072;
        break;
      case 'text-embedding-ada-002':
        this.dimension = 1536;
        break;
      default:
        this.dimension = 1536;
    }
  }

  /**
   * Generate an embedding for a single text chunk
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding from empty text');
    }

    try {
      const result = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = result.data[0]?.embedding;
      if (!embedding) {
        throw new Error('OpenAI returned empty embedding data');
      }

      return embedding;
    } catch (error: any) {
      throw new Error(`OpenAI embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (texts.length === 1 && texts[0]) {
      return [await this.generateEmbedding(texts[0])];
    }

    const cleanTexts = texts.filter((t) => t && t.trim().length > 0);

    try {
      const result = await this.client.embeddings.create({
        model: this.model,
        input: cleanTexts,
      });

      if (!result.data || result.data.length === 0) {
        throw new Error('OpenAI returned empty batch embedding data');
      }

      return result.data.map((point: any) => point.embedding);
    } catch (error: any) {
      throw new Error(`OpenAI batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Get the dimension of generated embeddings
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Check if this service supports a given provider
   */
  isProviderSupported(providerId: string): boolean {
    return providerId.toLowerCase() === 'openai';
  }

  /**
   * Get the provider ID used by this service
   */
  getProviderId(): string {
    return 'openai';
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Stub for message creation (not supported by embedding adapter)
   */
  createMessage(_system: string, _messages: Message[], _tools?: ToolDefinition[]): ApiStream {
    throw new Error('OpenAIEmbeddingAdapter does not support message creation');
  }

  /**
   * Get model metadata
   */
  getModelInfo(): ModelInfo {
    return {
      id: this.model,
      name: `OpenAI ${this.model}`,
      maxTokens: 8191,
      supportsPromptCache: false,
      supportsReasoning: false,
      supportsStreaming: false,
    };
  }

  /**
   * Generate embeddings (satisfied by generateEmbedding)
   */
  async embedText(text: string): Promise<number[]> {
    return this.generateEmbedding(text);
  }

  /**
   * Thinking budget (not applicable)
   */
  getThinkingBudgetTokenLimit(): number {
    return 0;
  }

  /**
   * Prompt strategy
   */
  getPromptStrategy(): PromptStrategy {
    return PromptStrategy.OPENAI;
  }
}
