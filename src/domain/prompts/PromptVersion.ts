/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for prompt version control and lineage tracking.
 */

import { PromptCategory } from './PromptCategory';
import type { PromptDefinition } from './PromptCategory';
import type { SystemEvent } from '../events/SystemEvent';

export interface PromptVersion {
  id: string;
  previousVersionId?: string;
  comparisonId?: string;
  snapshot: string; // Git-like SHA: "a1b2c3d4..."
  renderedContent: string;
  originalTemplate: string;
  renderedAt: string;
  recordedBy: 'system' | 'user' | 'automation';
  reason?: string;
  tags: string[];
  contextualData: ContextualData;
  diffs?: Diff[];
  conflictResolution?: ConflictResolution;
  recordedAt?: string;
}

export interface ContextualData {
  renderTriggers: {
    sessionId: string;
    timestamp: string;
    event?: SystemEvent;
  };
  environmentalContext: {
    projectPath: string;
    activeTools: string[];
    loadedCollections: string[];
    userContext: Record<string, any>;
  };
  performanceMetrics: {
    renderTimeMs: number;
    variableCount: number;
    ifBlockCount: number;
    forLoopCount: number;
    sizeKb: number;
  };
}

export interface Diff {
  type: 'text' | 'variable' | 'block' | 'conditional';
  left?: string;
  right?: string;
  location: { line: number; length: number };
  description: string;
}

export interface ConflictResolution {
  detected: boolean;
  strategy: 'OVERWRITE' | 'MERGE' | 'ANNOTATE' | 'PRUNE';
  metadata: {
    version: string;
    priority: number;
    timestamp: string;
    conflictType: ConflictType;
  };
}

export enum ConflictType {
  DUPLICATE_ID = 'DUPLICATE_ID',
  CATEGORY_CHANGED = 'CATEGORY_CHANGED',
  UPGRADE_REQUIRED = 'UPGRADE_REQUIRED',
  INCOMPATIBLE_VAR_NAMESPACE = 'INCOMPATIBLE_VAR_NAMESPACE'
}

/**
 * Version control system for prompt history and rollbacks
 */
export class PromptVersionController {
  private versions: Map<string, PromptVersion[]> = new Map();
  private latestVersions: Map<string, PromptVersion> = new Map();
  private currentBranch = new Map<string, string>(); // promptId -> versionId

  /**
   * Creates a new version of a prompt
   */
  createVersion(
    promptId: string,
    renderedContent: string,
    originalTemplate: string,
    context: ContextualData,
    options: {
      comparisonId?: string;
      reason?: string;
      tags?: string[];
    } = {}
  ): PromptVersion {
    const version: PromptVersion = {
      id: context.renderTriggers.sessionId + '-' + (Math.random() * 1000000).toFixed(0),
      previousVersionId: this.latestVersions.get(promptId)?.id,
      comparisonId: options.comparisonId,
      snapshot: this.generateSnapshot(promptId, renderedContent, context),
      renderedContent,
      originalTemplate,
      renderedAt: context.renderTriggers.timestamp,
      recordedBy: 'system',
      reason: options.reason,
      tags: options.tags || ['snapshot'],
      contextualData: context,
      diffs: this.calculateDiffs(
        this.latestVersions.get(promptId)?.renderedContent || '',
        renderedContent
      )
    };

    // Store versions (keep last 50 for memory efficiency)
    const versions = this.versions.get(promptId) || [];
    versions.push(version);
    if (versions.length > 50) versions.shift();

    this.latestVersions.set(promptId, version);
    return version;
  }

  /**
   * Restores a specific version of a prompt
   */
  restoreVersion(
    promptId: string,
    versionId: string
  ): PromptVersion {
    const versions = this.versions.get(promptId);
    const version = versions?.find(v => v.id === versionId);

    if (!version) {
      throw new Error(`Version ${versionId} not found for prompt ${promptId}`);
    }

    return version;
  }

  /**
   * Gets version history for a prompt
   */
  getVersionHistory(
    promptId: string,
    limit: number = 20
  ): PromptVersion[] {
    const versions = this.versions.get(promptId) || [];
    return versions.slice(-limit);
  }

  /**
   * Finds most recent version that matches a criteria
   */
  findRecentVersion(
    promptId: string,
    predicate: (version: PromptVersion) => boolean
  ): PromptVersion | undefined {
    const versions = this.getVersionHistory(promptId, 5);
    return [...versions].reverse().find(predicate);
  }

  /**
   * Compares two prompt versions and generates diff
   */
  compareVersions(
    promptId: string,
    baseVersionId: string,
    targetVersionId?: string
  ): Array<{
    type: 'text' | 'variable' | 'block' | 'conditional';
    left?: string;
    right?: string;
    location: { line: number; length: number };
    description: string;
  }> {
    const targetId = targetVersionId || this.findNewestVersionId(promptId);
    const baseVersion = this.getVersion(promptId, baseVersionId);
    const targetVersion = targetId ? this.getVersion(promptId, targetId) : baseVersion;

    if (!baseVersion || !targetVersion) {
      throw new Error('Invalid version comparison');
    }

    return this.calculateDiffs(baseVersion.renderedContent, targetVersion.renderedContent);
  }

  /**
   * Gets a specific version
   */
  private getVersion(
    promptId: string,
    versionId: string
  ): PromptVersion | undefined {
    return this.versions.get(promptId)?.find(v => v.id === versionId);
  }

  /**
   * Finds the newest version ID
   */
  private findNewestVersionId(promptId: string): string | undefined {
    const versions = this.getVersionHistory(promptId, 1);
    return versions[0]?.id;
  }

  /**
   * Generates a git-like SHA snapshot
   */
  private generateSnapshot(
    promptId: string,
    content: string,
    context: ContextualData
  ): string {
    const rawString = `${promptId}:${content}:${new Date(context.renderTriggers.timestamp).getTime()}`;
    let hash = 0;
    
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16).padStart(8, '0');
  }

  /**
   * Calculates diffs between two versions
   */
  private calculateDiffs(
    oldContent: string,
    newContent: string
  ): Diff[] {
    const diffs: Diff[] = [];
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let oldLine = 0;
    let newLine = 0;

    while (oldLine < oldLines.length || newLine < newLines.length) {
      if (oldLine === oldLines.length) {
        diffs.push({
          type: 'text',
          right: `+ ${newLines[newLine]}`,
          location: { line: newLine + 1, length: 1 },
          description: 'Inserted line'
        });
        newLine++;
      } else if (newLine === newLines.length) {
        diffs.push({
          type: 'text',
          left: `- ${oldLines[oldLine]}`,
          location: { line: oldLine + 1, length: 1 },
          description: 'Deleted line'
        });
        oldLine++;
      } else if (oldLines[oldLine] === newLines[newLine]) {
        const oldLineText = oldLines[oldLine] || '';
        const newLineText = newLines[newLine] || '';
        if (oldLineText.trim()) {
          diffs.push({
            type: 'text',
            left: `  ${oldLineText}`,
            right: `  ${newLineText}`,
            location: { line: newLine + 1, length: 1 },
            description: 'Unchanged'
          });
        }
        oldLine++;
        newLine++;
      } else {
        // Line changed - detect if it's a variable vs text
        const isVariableLines = this.isVariableLine((oldLines[oldLine] || '')) && this.isVariableLine((newLines[newLine] || ''));
        
        diffs.push({
          type: isVariableLines ? 'variable' : 'text',
          left: isVariableLines ? undefined : `- ${oldLines[oldLine]}`,
          right: isVariableLines ? undefined : `+ ${newLines[newLine]}`,
          location: { line: newLine + 1, length: 1 },
          description: 'Changed'
        });
        oldLine++;
        newLine++;
      }
    }

    return diffs;
  }

  /**
   * Checks if a line contains a variable syntax
   */
  private isVariableLine(line: string): boolean {
    return /\{\{.*?\}\}/.test(line) || /access.*\.$/.test(line);
  }

  /**
   * Resets to a prior version (marks as auto-reset)
   */
  autoReset(promptId: string, reason?: string) {
    const currentVersion = this.latestVersions.get(promptId);
    if (!currentVersion) return;

    this.createVersion(
      promptId, 
      currentVersion.renderedContent, 
      currentVersion.originalTemplate, 
      {
        renderTriggers: { sessionId: 'system', timestamp: new Date().toISOString() },
        environmentalContext: { projectPath: '', activeTools: [], loadedCollections: [], userContext: {} },
        performanceMetrics: { renderTimeMs: 0, variableCount: 0, ifBlockCount: 0, forLoopCount: 0, sizeKb: 0 }
      },
      { reason, tags: ['auto-reset'] }
    );
  }

  /**
   * Tags a version for quick reference
   */
  tagVersion(promptId: string, versionId: string, tagName: string): void {
    const version = this.getVersion(promptId, versionId);
    if (version) {
      version.tags.push(tagName);
    }
  }

  diffTypes(): Record<string, string> {
    return {
      text: 'Line-by-line text diff',
      variable: 'Variable substitution change',
      block: 'Entire block structure change',
      conditional: 'Conditional logic alteration'
    };
  }
}

/**
 * Convenience wrapper for version controller
 */
export class PromptVersionSnapshot extends PromptVersionController {
  constructor() {
    super();
  }

  /**
   * Records a prompt snapshot on event
   */
  record(
    event: SystemEvent, 
    renderedPrompt: string, 
    originalTemplate: string
  ): PromptVersion {
    const promptData = event.data || {};
    const promptId = promptData.promptId || promptData.session?.promptId || 'unknown';
    
    return this.createVersion(
      promptId,
      renderedPrompt,
      originalTemplate,
      this.extractContextFromEvent(event)
    );
  }

  private extractContextFromEvent(event: SystemEvent): ContextualData {
    return {
      renderTriggers: {
        sessionId: event.metadata?.sessionId || 'unknown',
        timestamp: event.timestamp || new Date().toISOString(),
        event
      },
      environmentalContext: {
        projectPath: event.data?.projectPath || event.data?.workspace || '',
        activeTools: event.data?.activeTools || [],
        loadedCollections: event.data?.loadedCollections || [],
        userContext: event.data?.userContext || {}
      },
      performanceMetrics: {
        renderTimeMs: event.metadata?.durationMs || 0,
        variableCount: event.data?.variableCount || 0,
        ifBlockCount: event.data?.ifBlockCount || 0,
        forLoopCount: event.data?.forLoopCount || 0,
        sizeKb: 0
      }
    };
  }
}