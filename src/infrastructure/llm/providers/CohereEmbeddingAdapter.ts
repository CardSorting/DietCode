/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Cohere embedding provider implementation
 * 
 * Implements the EmbeddingService interface for Cohere embeddings.
 * Supports multi-lingual and optimized models.
 */

import type { EmbeddingService } from '../../../domain/agent/EmbeddingService';
import type { LLMAdapter, ModelInfo, ApiStream, Message } from '../../../domain/agent/LLMProviderAdapter';
import { PromptStrategy } from '../../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';

/**
 * Cohere Embedding Adapter configuration
 */
export interface CohereEmbeddingConfig {
  apiKey: string;
  model: 'embed-english-v3.0' | 'embed-multilingual-v3.0' | 'embed-english-light-v3.0';
  batchSize?: number;
  timeoutMs?: number;
}

/**
 * Cohere Embedding Adapter
 * 
 * Generates embeddings using Cohere's embedding models.
 * Supports multi-lingual (english, multilingual) and optimized models.
 * 
 * Implements both EmbeddingService for RAG and LLMAdapter for the registry.
 */
export class CohereEmbeddingAdapter implements EmbeddingService, LLMAdapter {
  private apiKey: string;
  private model: string;
  private batchSize: number;
  private dimension: number;

  constructor(config: CohereEmbeddingConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.batchSize = config.batchSize || 100; // Cohere recommends 100 for best performance

    // Set dimension based on model
    switch (this.model) {
      case 'embed-english-v3.0':
      case 'embed-english-light-v3.0':
        this.dimension = 1024;
        break;
      case 'embed-multilingual-v3.0':
        this.dimension = 1024;
        break;
      default:
        this.dimension = 1024;
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
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          texts: [text],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cohere API error ${response.status}: ${error}`);
      }

      const data = await response.json() as any;

      return data.embeddings[0];
    } catch (error: any) {
      throw new Error(`Cohere embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple text chunks in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const cleanedTexts = texts.filter(t => t && t.trim().length > 0);
    
    // Send in batches if it's larger than the limit
    const batches: string[][] = [];
    for (let i = 0; i < cleanedTexts.length; i += this.batchSize) {
      batches.push(cleanedTexts.slice(i, i + this.batchSize));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      try {
        const response = await fetch('https://api.cohere.ai/v1/embed', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            texts: batch,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Cohere API error ${response.status}: ${error}`);
        }

        const data = await response.json() as any;
        allEmbeddings.push(...data.embeddings);
      } catch (error: any) {
        throw new Error(`Cohere batch embedding generation failed: ${error.message}`);
      }
    }

    return allEmbeddings;
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
    return providerId.toLowerCase() === 'cohere';
  }

  /**
   * Get the provider ID used by this service
   */
  getProviderId(): string {
    return 'cohere';
  }

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get model metadata
   */
  getModelInfo(): ModelInfo {
    return {
      id: this.model,
      name: `Cohere ${this.model}`,
      maxTokens: 4096,
      supportsPromptCache: false,
      supportsReasoning: false,
      supportsStreaming: false
    };
  }

  /**
   * Message creation (not supported)
   */
  createMessage(
    _system: string,
    _messages: Message[],
    _tools?: ToolDefinition[]
  ): ApiStream {
    throw new Error('Message creation not supported in embedding adapter');
  }

  /**
   * Embedding (maps to generateEmbedding)
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
    return PromptStrategy.COHERE;
  }
}
