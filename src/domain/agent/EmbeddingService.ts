/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, no external I/O
 * Prework Status: Not applicable (new file)
 *
 * Domain interface for semantic embedding generation.
 * Abstracts vector embedding operations for RAG (Retrieval-Augmented Generation).
 */

/**
 * Embedding service interface
 *
 * Generates numerical vector representations of text for semantic search.
 * This enables DietCode to perform content-based retrieval, similarity matching,
 * and intelligent knowledge caching.
 */
export interface EmbeddingService {
  /**
   * Generate an embedding for a single text chunk
   *
   * @param text - Text to embed
   * @returns A vector array representing the semantic meaning of the text
   * @throws Error if generation fails (network error, invalid input, etc.)
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple text chunks in batch
   *
   * Batch generation is more efficient than sequential calls,
   * especially for providers with rate limits or batching APIs.
   *
   * @param texts - Array of text chunks to embed
   * @returns Array of embeddings, matching the order of input texts
   * @throws Error if batch generation fails
   */
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimension of generated embeddings
   *
   * @returns The dimensionality of the embedding space
   */
  getDimension(): number;

  /**
   * Check if this service supports a given provider
   *
   * @param providerId - Provider identifier (e.g., "openai", "cohere")
   * @returns True if this service can provide embeddings for the provider
   */
  isProviderSupported(providerId: string): boolean;

  /**
   * Get the provider ID used by this service
   *
   * @returns Provider identifier string
   */
  getProviderId(): string;
}

/**
 * Embedding search result with relevance score
 */
export interface EmbeddingSearchResult {
  /**
   * The original text
   */
  text: string;

  /**
   * The embedding vector
   */
  embedding: number[];

  /**
   * Vector distance to search query (lower = more similar)
   * Common distance metrics: cosine, euclidean, dot product
   */
  distance: number;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Vector distance metrics
 */
export enum DistanceMetric {
  COSINE = 'cosine',
  EUCLIDEAN = 'euclidean',
  DOT_PRODUCT = 'dot_product',
}
