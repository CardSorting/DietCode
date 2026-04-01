/**
 * [LAYER: CORE]
 * Principle: Cognitive Economy — manages and optimizes the LLM context window.
 * "Prunes" or "folds" large attachments to keep the most relevant information.
 */

import type { Attachment } from '../../domain/context/Attachment';

export class ContextPruner {
  private readonly MAX_FILE_LINES = 150;

  /**
   * Intelligently prunes a list of attachments.
   */
  prune(attachments: Attachment[]): Attachment[] {
    return attachments.map(attachment => this.pruneAttachment(attachment));
  }

  private pruneAttachment(attachment: Attachment): Attachment {
    if (attachment.content.type !== 'file_content') {
      return attachment;
    }

    const content = attachment.content.content;
    const lines = content.split('\n');

    if (lines.length <= this.MAX_FILE_LINES) {
      return attachment;
    }

    // "Semantic Folding": Keep the first and last parts of the file, 
    // and summarize the middle if it's too long.
    const headSize = Math.floor(this.MAX_FILE_LINES * 0.6);
    const tailSize = Math.floor(this.MAX_FILE_LINES * 0.3);
    
    const head = lines.slice(0, headSize).join('\n');
    const tail = lines.slice(-tailSize).join('\n');
    
    const prunedContent = `${head}\n\n... [FOLDED: ${lines.length - headSize - tailSize} lines hidden for cognitive focus] ...\n\n${tail}`;

    return {
      ...attachment,
      content: {
        ...attachment.content,
        content: prunedContent,
        info: {
          ...attachment.content.info!,
          isPruned: true,
          originalLineCount: lines.length
        }
      }
    } as any;
  }
}
