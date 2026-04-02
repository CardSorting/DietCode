/**
 * [LAYER: CORE]
 * Principle: Intelligent extraction of path context for rule activation.
 * Inspired by Cline's RuleContextBuilder.
 * 
 * Extracts possible file paths from messages, tabs, and tool operations
 * to provide a ranked list of relevant candidates for rule evaluation.
 */

import type { LivePathContext, ToolIntent, RuleEvaluationContext } from '../../domain/context/RuleContextContract.ts';

export class RuleContextBuilder {
  private static readonly MAX_CANDIDATES = 100;

  /**
   * Builds the comprehensive evaluation context
   */
  static async buildContext(
    lastMessage?: string,
    visibleTabs: string[] = [],
    completedTools: { tool: string; path?: string }[] = [],
    pendingIntents: ToolIntent[] = []
  ): Promise<LivePathContext> {
    const candidates = new Set<string>();

    // 1. Extract from latest message (High Confidence)
    if (lastMessage) {
      const pathsIdentified = this.extractPathsFromText(lastMessage);
      pathsIdentified.forEach(p => candidates.add(p));

      const mentions = this.extractMentions(lastMessage);
      mentions.forEach(m => candidates.add(m));
    }

    // 2. Extract from visible tabs (Current Focus)
    visibleTabs.forEach(p => candidates.add(p));

    // 3. Extract from completed operations (Recent History)
    completedTools.forEach(op => {
      if (op.path) candidates.add(op.path);
    });

    // 4. Extract from pending tool intents (Future Intent)
    pendingIntents.forEach(intent => {
      if (intent.path) candidates.add(intent.path);
      if (intent.content) {
        const patchPaths = this.extractPathsFromPatch(intent.content);
        patchPaths.forEach(p => candidates.add(p));
      }
    });

    return {
      paths: Array.from(candidates).sort().slice(0, this.MAX_CANDIDATES),
      lastMessageText: lastMessage,
      visibleTabs,
      completedOperations: completedTools.map(op => `${op.tool}:${op.path || ''}`),
      pendingOperations: pendingIntents
    };
  }

  /**
   * Extract potential paths from plain text using regex
   */
  private static extractPathsFromText(text: string): string[] {
    // Regex looking for common path patterns, including [MODIFY] [file](file:///...)
    const pathRegex = /(?:[a-zA-Z]:\\|[\\\/])?(?:[\w\-. ]+[\\\/])*[\w\-. ]+\.[\w\-]{2,}/g;
    const markdownPathRegex = /\[.*?\]\(file:\/\/\/(.*?)\)/g;
    
    const results: string[] = [];
    
    let m: RegExpExecArray | null;
    while ((m = pathRegex.exec(text))) {
      results.push(this.normalizePath(m[0]!));
    }
    
    while ((m = markdownPathRegex.exec(text))) {
      results.push(this.normalizePath(m[1]!));
    }
    
    return results;
  }

  /**
   * Extract paths from @mentions (e.g. "Check @src/core/context/Tracker.ts")
   */
  private static extractMentions(text: string): string[] {
    const mentionRegex = /@([\w\-. \/]+\.[\w\-]{2,})/g;
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(text))) {
      results.push(this.normalizePath(m[1]!));
    }
    return results;
  }

  /**
   * Extract paths from patch headers (e.g. *** Add File: path/to/file.ts)
   */
  private static extractPathsFromPatch(patch: string): string[] {
    const paths: string[] = [];
    const fileHeaderRegex = /^\*\*\* (?:Add|Update|Delete) File: (.+?)(?:\n|$)/gm;
    let m: RegExpExecArray | null;
    while ((m = fileHeaderRegex.exec(patch))) {
      paths.push(this.normalizePath((m[1] || "").trim()));
    }
    return paths;
  }

  /**
   * Normalize path to POSIX style and remove leading slash
   */
  private static normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").replace(/^\//, "").trim();
  }
}
