/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for Rule Context Extraction.
 * Inspired by Cline's RuleContextBuilder.
 */

export interface ToolIntent {
  tool: string;
  path?: string;
  content?: string; // e.g. for patch headers
  timestamp: number;
}

export interface LivePathContext {
  paths: string[];
  lastMessageText?: string;
  visibleTabs: string[];
  completedOperations: string[];
  pendingOperations: ToolIntent[];
}

export interface RuleEvaluationContext {
  candidates: string[];
  workspaceRoot: string;
  topK?: number; // Limit rule activation to top K relevant candidates
}

/**
 * PatchParser Contract
 * Pure logic for extracting paths from diff/patch headers.
 */
export interface PatchParser {
  extractPaths(patch: string): string[];
}
