/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: OpenAI embedding provider implementation
 * Prework Status: Not applicable (new file)
 * 
 * Implements the EmbeddingService interface for OpenAI embeddings.
 * Supports the text-embedding-3-small and text-embedding-3-large models.
 */

import { OpenAI } from 'openai';
import type { EmbeddingService } from '../../domain/agent/EmbeddingService';

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
 */
export class OpenAIEmbeddingAdapter implements EmbeddingService {
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

      return result.data[0].embedding;
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

    if (texts.length === 1) {
      return [await this.generateEmbedding(texts[0])];
    }

    const cleanTexts = texts.filter(t => t && t.trim().length > 0);

    try {
      const result = await this.client.embeddings.create({
        model: this.model,
        input: cleanTexts,
      });

      return result.data.map(point => point.embedding);
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
}

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
 */
export class CohereEmbeddingAdapter implements EmbeddingService {
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

      const data = await response.json();

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

        const data = await response.json();
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
}