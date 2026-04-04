/**
 * [LAYER: CORE]
 * Principle: Cognitive Economy — manages and optimizes the LLM context window.
 * "Prunes" or "folds" large attachments to keep the most relevant information.
 */

import type { Attachment } from '../../domain/context/Attachment';

/**
 * Pruned attachment result
 */
export interface PrunedAttachment {
  original: Attachment;
  pruned: Attachment;
  isPruned: boolean;
  reason: string;
}

/**
 * File folding configuration
 */
export interface FoldingConfig {
  maxLines: number;
  headRatio: number;
  tailRatio: number;
}

export type AttachmentInfoState = 'original' | 'pruned';

export interface AttachmentInfoOriginal {
  isPruned: false;
  originalLineCount: number;
  state: AttachmentInfoState;
}

export interface AttachmentInfoPruned {
  isPruned: true;
  originalLineCount: number;
  state: AttachmentInfoState;
}

export type AttachmentInfo = AttachmentInfoOriginal | AttachmentInfoPruned;

/**
 * Core content info
 */
export interface CoreContentInfo {
  fileName?: string;
  fileType: string;
  isPragma: boolean;
  fileSize: number;
  lineCount: number;
  isPruned: boolean;
  originalLineCount?: number;
  state: AttachmentInfoState;
}

/**
 * Content with folding metadata
 */
export interface FoldedContent {
  original: string;
  folded: string;
  config: FoldingConfig;
}

/**
 * Pruned attachment
 */
export interface PrunedAttachmentData {
  key: string;
  fileName?: string;
  fileType: string;
  description?: string;
  content: FoldedContent;
  info: {
    isPruned: true;
    originalLineCount: number;
    state: 'pruned';
  };
  headersPresent: boolean;
  lastModified: string;
  lastModifiedMs: number;
}

/**
 * Configuration for context pruning behavior
 */
export class ContextPrunerConfig {
  readonly maxLines: number;
  readonly headRatio: number;
  readonly tailRatio: number;
  readonly enabled: boolean;

  constructor(config: Partial<FoldingConfig> = {}) {
    this.maxLines = config.maxLines ?? 150;
    this.headRatio = config.headRatio ?? 0.6;
    this.tailRatio = config.tailRatio ?? 0.3;
    this.enabled = true;
  }
}

export class ContextPruner {
  private config: ContextPrunerConfig;

  constructor(config: Partial<FoldingConfig> = {}) {
    this.config = new ContextPrunerConfig(config);
  }

  /**
   * Intelligently prunes a list of attachments.
   */
  prune(attachments: Attachment[]): Attachment[] {
    if (!this.config.enabled) {
      return attachments;
    }

    const result: Attachment[] = [];
    for (const attachment of attachments) {
      result.push(this.pruneAttachment(attachment));
    }
    return result;
  }

  private pruneAttachment(attachment: Attachment): Attachment {
    if (attachment.content.type !== 'file_content') {
      return attachment;
    }

    const content = attachment.content.content;
    const lines = content.split('\n');

    if (lines.length <= this.config.maxLines) {
      return {
        ...attachment,
        content: {
          ...attachment.content,
          info: {
            ...attachment.content.info,
            isPruned: false,
            originalLineCount: lines.length,
          },
        },
      };
    }

    // "Semantic Folding": Keep the first and last parts of the file,
    // and summarize the middle if it's too long.
    const headSize = Math.floor(this.config.maxLines * this.config.headRatio);
    const tailSize = Math.floor(this.config.maxLines * this.config.tailRatio);

    const head = lines.slice(0, headSize).join('\n');
    const tail = lines.slice(-tailSize).join('\n');

    const prunedContent = `${head}\n\n... [FOLDED: ${lines.length - headSize - tailSize} lines hidden for cognitive focus] ...\n\n${tail}`;

    return {
      ...attachment,
      content: {
        ...attachment.content,
        content: prunedContent,
        info: {
          ...attachment.content.info,
          isPruned: true,
          originalLineCount: lines.length,
        },
      },
    };
  }
}
