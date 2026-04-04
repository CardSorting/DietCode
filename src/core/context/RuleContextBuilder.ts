/**
 * [LAYER: CORE]
 * Principle: Intelligent extraction of path context for rule activation.
 * Inspired by Cline's RuleContextBuilder.
 *
 * Extracts possible file paths from messages, tabs, and tool operations
 * to provide a ranked list of relevant candidates for rule evaluation.
 */

import type {
  LivePathContext,
  RuleEvaluationContext,
  ToolIntent,
} from '../../domain/context/RuleContextContract.ts';

const MAX_CANDIDATES = 100;

// Extract potential paths from plain text using regex
function extractPathsFromText(text: string): string[] {
  // Regex looking for common path patterns, including [MODIFY] [file](file:///...)
  const pathRegex = /(?:[a-zA-Z]:\\|[\\\/])?(?:[\w\-. ]+[\\\/])*[\w\-. ]+\.[\w\-]{2,}/g;
  const markdownPathRegex = /\[.*?\]\(file:\/\/\/(.*?)\)/g;

  const results: string[] = [];

  let match: ReturnType<typeof pathRegex.exec> | null;
  while ((match = pathRegex.exec(text))) {
    results.push(normalizePath(match[0]));
  }

  while ((match = markdownPathRegex.exec(text))) {
    results.push(normalizePath(match[1]));
  }

  return results;
}

// Extract paths from @mentions (e.g. "Check @src/core/context/Tracker.ts")
function extractMentions(text: string): string[] {
  const mentionRegex = /@([\w\-. \/]+\.[\w\-]{2,})/g;
  const results: string[] = [];
  let match: ReturnType<typeof mentionRegex.exec> | null;
  while ((match = mentionRegex.exec(text))) {
    results.push(normalizePath(match[1]));
  }
  return results;
}

// Extract paths from patch headers (e.g. *** Add File: path/to/file.ts)
function extractPathsFromPatch(patch: string): string[] {
  const paths: string[] = [];
  const fileHeaderRegex = /^\*\*\* (?:Add|Update|Delete) File: (.+?)(?:\n|$)/gm;
  let match: ReturnType<typeof fileHeaderRegex.exec> | null;
  while ((match = fileHeaderRegex.exec(patch))) {
    const matchValue = match[1] || '';
    paths.push(normalizePath(matchValue.trim()));
  }
  return paths;
}

/**
 * Normalize path to POSIX style and remove leading slash
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\//, '').trim();
}

/**
 * Builds the comprehensive evaluation context
 */
export async function buildContext(
  lastMessage?: string,
  visibleTabs: string[] = [],
  completedTools: { tool: string; path?: string }[] = [],
  pendingIntents: ToolIntent[] = [],
): Promise<LivePathContext> {
  const candidates = new Set<string>();

  // 1. Extract from latest message (High Confidence)
  if (lastMessage) {
    const pathsIdentified = extractPathsFromText(lastMessage);
    for (const p of pathsIdentified) {
      candidates.add(p);
    }

    const mentions = extractMentions(lastMessage);
    for (const m of mentions) {
      candidates.add(m);
    }
  }

  // 2. Extract from visible tabs (Current Focus)
  for (const p of visibleTabs) {
    candidates.add(p);
  }

  // 3. Extract from completed operations (Recent History)
  for (const op of completedTools) {
    if (op.path) candidates.add(op.path);
  }

  // 4. Extract from pending tool intents (Future Intent)
  for (const intent of pendingIntents) {
    if (intent.path) candidates.add(intent.path);
    if (intent.content) {
      const patchPaths = extractPathsFromPatch(intent.content);
      for (const p of patchPaths) {
        candidates.add(p);
      }
    }
  }

  return {
    paths: Array.from(candidates).sort().slice(0, MAX_CANDIDATES),
    lastMessageText: lastMessage,
    visibleTabs,
    completedOperations: completedTools.map((op) => `${op.tool}:${op.path || ''}`),
    pendingOperations: pendingIntents,
  };
}
