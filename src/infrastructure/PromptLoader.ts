/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — connects prompt files to domain contracts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LogService } from '../domain/logging/LogService';
import { PromptCategory } from '../domain/prompts/PromptCategory';
import type { PromptDefinition } from '../domain/prompts/PromptCategory';
import { TemplateEngine } from '../domain/prompts/PromptTemplateEngine';
import type { TemplateContext } from '../domain/prompts/PromptTemplateEngine';
import type { TemplateRenderOptions } from '../domain/prompts/PromptTemplateEngine';
import type { Filesystem } from '../domain/system/Filesystem';

export class PromptLoader {
  private categoryMap: Map<string, PromptCategory> = this.initializeCategoryMap();

  constructor(
    private filesystem: Filesystem,
    private logService: LogService,
  ) {}

  /**
   * Basic category identification heuristic for unknown markdown files.
   */
  private initializeCategoryMap(): Map<string, PromptCategory> {
    return new Map([
      ['system', PromptCategory.SYSTEM_CORE],
      ['agent', PromptCategory.AGENT_ORCHESTRATION],
      ['tool', PromptCategory.TOOL_PROTOCOLS],
      ['memory', PromptCategory.MEMORY_CYCLES],
      ['verification', PromptCategory.VERIFICATION_CHECKPOINTS],
      ['utility', PromptCategory.UTILITY_OPERATIONS],
      ['security', PromptCategory.SECURITY_PATTERNS],
    ]);
  }

  /**
   * Loads and parses a single markdown prompt file.
   */
  async loadMarkdownFile(filepath: string): Promise<PromptDefinition> {
    const raw = this.filesystem.readFile(filepath);
    const { frontmatter, content } = this.parseTealiumMark(raw);

    return {
      id: this.generateId(filepath),
      category: this.classifyByMetadata(frontmatter, filepath),
      name: frontmatter.name || this.extractName(filepath),
      description: frontmatter.description || '',
      content: content,
      metadata: {
        source: filepath,
        formattedDate: frontmatter.date,
        tags: frontmatter.tags || [],
        version: frontmatter.version || '1.0.0',
        license: frontmatter.license || 'Apache-2.0',
        ...this.applyDietCodeMetadata(frontmatter),
      },
    };
  }

  /**
   * Parses the Tealium Mark format:
   * - Frontmatter in YAML (--- \n content \n ---)
   * - Supported template syntax: {{VAR}}, {% IF condition %}, {% INCLUDE file %}
   */
  private parseTealiumMark(content: string): { frontmatter: any; content: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, content };
    }

    const frontmatterBlock = match[1];
    const bodyContent = content.substring(match[0].length);

    const frontmatter: any = {};

    if (frontmatterBlock) {
      // Parse YAML-style frontmatter
      const lines = frontmatterBlock.split('\n');
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          frontmatter[key.trim()] = value.includes(',')
            ? value.split(',').map((v: string) => v.trim())
            : value;
        }
      }
    }

    return { frontmatter, content: bodyContent };
  }

  private generateId(filepath: string): string {
    return `prompt_${path.basename(filepath, '.md')}_${Date.now().toString(36)}`;
  }

  private classifyByMetadata(frontmatter: any, filepath: string): PromptCategory {
    // Check for explicit category
    if (frontmatter.category) {
      const category = this.categoryMap.get(frontmatter.category.toLowerCase());
      if (category) return category;
    }

    // Heuristic classification based on filename/content
    const contentLower = filepath.toLowerCase();
    if (contentLower.includes('memory') || contentLower.includes('consolidate')) {
      return PromptCategory.MEMORY_CYCLES;
    }
    if (
      contentLower.includes('tool') ||
      contentLower.includes('shell') ||
      contentLower.includes('file')
    ) {
      return PromptCategory.TOOL_PROTOCOLS;
    }
    if (
      contentLower.includes('verify') ||
      contentLower.includes('security') ||
      contentLower.includes('risk')
    ) {
      return PromptCategory.VERIFICATION_CHECKPOINTS;
    }
    if (contentLower.includes('agent') || contentLower.includes('orchestrate')) {
      return PromptCategory.AGENT_ORCHESTRATION;
    }

    // Default to SYSTEM_CORE
    return PromptCategory.SYSTEM_CORE;
  }

  private extractName(filepath: string): string {
    return path
      .basename(filepath, '.md')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private applyDietCodeMetadata(frontmatter: any): Record<string, any> {
    const metadata: any = {};

    // Check for DietCode-specific metadata
    if (frontmatter.dietcode_feature) {
      metadata.dietcodeFeature = frontmatter.dietcode_feature;
    }

    if (frontmatter.memory_depth) {
      metadata.recommendedMemoryDepth = Number.parseInt(frontmatter.memory_depth);
    }

    if (frontmatter.danger_level) {
      metadata.dangerLevel = frontmatter.danger_level;
    }

    if (frontmatter.feedback_loop) {
      metadata.parentId = frontmatter.feedback_loop;
      metadata.expectedFlow = frontmatter.expected_flow || 'post_execution';
    }

    return metadata;
  }

  /**
   * Validates prompt safety and compliance.
   * Enforces strict constraints to prevent malicious behavior.
   */
  validatePrompt(prompt: PromptDefinition): boolean {
    // Rule 1: Content size limits
    if (prompt.content.length > 100000) {
      this.logService.warn(`[${prompt.id}] Prompt exceeds size limit (100KB)`, {
        promptId: prompt.id,
        size: prompt.content.length,
      });
      return false;
    }

    // Rule 2: Deny certain dangerous patterns
    const dangerousPatterns = [
      'eval(',
      'Function(',
      'process.exit(',
      'child_process.exec',
      'system.exec',
      'eval_',
    ];

    for (const pattern of dangerousPatterns) {
      if (prompt.content.includes(pattern)) {
        this.logService.warn(`[${prompt.id}] Contains dangerous pattern: ${pattern}`, {
          promptId: prompt.id,
          pattern,
        });
        return false;
      }
    }

    // Rule 3: Remove interactive controls if not explicitly intended
    if (
      prompt.content.includes('<button') ||
      prompt.content.includes('<input') ||
      prompt.content.includes('onclick=')
    ) {
      this.logService.warn(
        `[${prompt.id}] Contains interactive HTML elements (allowed only in secure contexts)`,
        { promptId: prompt.id },
      );
    }

    return true;
  }
}
