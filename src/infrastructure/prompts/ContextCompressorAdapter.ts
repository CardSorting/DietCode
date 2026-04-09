/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implement Domain contracts, isolate I/O details
 */

import type { ContextCompressionStrategy } from '../../domain/prompts/ContextCompressionStrategy';
import type { CompressionOptions } from '../../domain/prompts/ContextCompressionStrategy';
import type { SessionContext } from '../../domain/prompts/ContextTypes';
import { LLMProviderRegistry } from '../../core/manager/LLMProviderRegistry';

export class ContextCompressorAdapter implements ContextCompressionStrategy {
  private settings: CompressionOptions;

  constructor(options: Partial<CompressionOptions> = {}) {
    this.settings = {
      compressThreshold: 70,
      preservePatterns: true,
      errorTriagePriority: 2,
      fields: {
        intent: true,
        decisions: true,
        next: true,
        errors: true,
        patterns: true,
        files: true,
        actions: true,
      },
      ...options,
    };
  }

  async compress(context: SessionContext[], options?: Partial<CompressionOptions>): Promise<any> {
    const startTime = Date.now();

    const fields: CompressionOptions['fields'] = options?.fields || {
      intent: true,
      decisions: true,
      next: true,
      errors: true,
      patterns: true,
      files: true,
      actions: true,
    };

    // Extract sections based on options
    const intent: string[] = [];
    const keyDecisions: string[] = [];
    const nextSteps: string[] = [];
    const errorTriage: string[] = [];
    const patterns: string[] = [];
    const fileChanges: string[] = [];
    const discreteActions: string[] = [];

    // Collect content from all messages
    const allMessages = context.flatMap((session) =>
      session.messages.map((msg) => ({ role: msg.role, content: msg.content || '' })),
    );

    // Simple extraction - in production would use proper NLP
    let intentIdx = 0;
    let decisionsIdx = 0;
    let nextIdx = 0;
    let errorsIdx = 0;
    let patternsIdx = 0;
    let filesIdx = 0;

    for (const msg of allMessages) {
      const contentLower = msg.content.toLowerCase();
      
      if (
        contentLower.includes('intent') || 
        contentLower.includes('goal') ||
        (msg.role === 'user' && msg.content.length < 300 && intentIdx < 1)
      ) {
        if (fields.intent && intentIdx < 1) {
          intent.push(msg.content.slice(0, 1000));
          intentIdx++;
        }
      }
      
      if (
        contentLower.includes('decision') || 
        contentLower.includes('decided') ||
        contentLower.includes('i will') ||
        contentLower.includes('we will')
      ) {
        if (fields.decisions && decisionsIdx < 5) {
          keyDecisions.push(msg.content.slice(0, 500));
          decisionsIdx++;
        }
      }
      
      if (
        contentLower.includes('next step') || 
        contentLower.includes('to continue') ||
        contentLower.includes('todo')
      ) {
        if (fields.next && nextIdx < 5) {
          nextSteps.push(msg.content.slice(0, 500));
          nextIdx++;
        }
      }
      
      if (
        contentLower.includes('error') || 
        contentLower.includes('exception') ||
        contentLower.includes('failed') ||
        contentLower.includes('issue')
      ) {
        if (fields.errors && errorsIdx < 5) {
          errorTriage.push(msg.content.slice(0, 500));
          errorsIdx++;
        }
      }
      
      if (contentLower.includes('pattern') || contentLower.includes('best practice')) {
        if (fields.patterns && patternsIdx < 3) {
          patterns.push(msg.content.slice(0, 500));
          patternsIdx++;
        }
      }
      
      if (
        contentLower.includes('file') || 
        contentLower.includes('modified') ||
        contentLower.includes('updated') ||
        contentLower.includes('changed')
      ) {
        if (fields.files && filesIdx < 10) {
          fileChanges.push(msg.content.slice(0, 500));
          filesIdx++;
        }
      }
    }

    const remainingContent = allMessages
      .filter(
        (msg) =>
          !intent.join('').includes(msg.content) &&
          !keyDecisions.join('').includes(msg.content) &&
          !nextSteps.join('').includes(msg.content) &&
          !errorTriage.join('').includes(msg.content) &&
          !patterns.join('').includes(msg.content) &&
          !fileChanges.join('').includes(msg.content),
      )
      .map((msg) => msg.content)
      .filter(Boolean);

    if (fields.actions && remainingContent) {
      discreteActions.push(...remainingContent.slice(0, 20));
    }

    const originalLength = allMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const targetRatio = options?.compressThreshold || 70;
    const compressedLength = Math.ceil(originalLength * (targetRatio / 100));

    const compressedSections = [
      { section: 'intent', size: intent.reduce((a, b) => a + b.length, 0) },
      { section: 'decisions', size: keyDecisions.reduce((a, b) => a + b.length, 0) },
      { section: 'next', size: nextSteps.reduce((a, b) => a + b.length, 0) },
      { section: 'errors', size: errorTriage.reduce((a, b) => a + b.length, 0) },
      { section: 'patterns', size: patterns.reduce((a, b) => a + b.length, 0) },
      { section: 'files', size: fileChanges.reduce((a, b) => a + b.length, 0) },
      { section: 'actions', size: discreteActions.reduce((a, b) => a + b.length, 0) },
    ].filter((s) => s.size > 0);

    return {
      intent: intent.length > 0 ? intent[0] : '',
      keyDecisions: keyDecisions.length > 0 ? [keyDecisions[0]] : [],
      nextSteps: nextSteps.length > 0 ? [nextSteps[0]] : [],
      errorTriage: errorTriage.length > 0 ? [errorTriage[0]] : [],
      patterns: patterns.length > 0 ? [patterns[0]] : [],
      fileChanges: fileChanges.length > 0 ? [fileChanges[0]] : [],
      discreteActions: discreteActions,
      compressedLength,
      compressionRatio: originalLength > 0 ? Math.min(1, compressedLength / originalLength) : 0,
      metadata: {
        sessionId: context[0]?.sessionId || 'unknown',
        timestamp: new Date(startTime),
        originalLength,
        compressedSections,
      },
    };
  }

  async estimateCompression(context: SessionContext[]): Promise<{
    originalLength: number;
    estimatedCompressedLength: number;
    compressionRatio: number;
    fieldsWithContent: number;
  }> {
    const allMessages = context.flatMap((session) =>
      session.messages.map((msg) => ({
        role: msg.role,
        content: msg.content || '',
      })),
    );

    const originalLength = allMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const targetRatio = 0.7;
    const estimatedCompressedLength = Math.ceil(originalLength * targetRatio);
    const compressionRatio = originalLength > 0 ? targetRatio : 0;

    const fieldsWithContent = [false, false, false, false, false, false, false].reduce(
      (acc, hasContent) => {
        let count = acc;
        count += hasContent ? 1 : 0;
        return count;
      },
      0,
    );

    return {
      originalLength,
      estimatedCompressedLength,
      compressionRatio,
      fieldsWithContent,
    };
  }

  async validate(compressed: any): Promise<boolean> {
    if (!compressed.intent || compressed.intent.length === 0) {
      return false;
    }

    if (!compressed.metadata || !compressed.metadata.timestamp) {
      return false;
    }

    if (compressed.compressedLength <= 0) {
      return false;
    }

    return true;
  }

  getSettings(): CompressionOptions {
    return {
      fields: {
        intent: true,
        decisions: true,
        next: true,
        errors: true,
        patterns: true,
        files: true,
        actions: true,
      },
    };
  }
}
