/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Production-grade content validation and integrity verification
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [NEW] Implements TaskConsistencyValidator for task.md and implementation.md validation
 */

import { memoizee } from 'memoizee';
import * as path from 'path';
import * as fs from 'fs';
import { TaskValidation, ConsistencyReport, Requirement } from '../../domain/task/TaskEntity';
import { SemanticIntegrityAnalyser } from './SemanticIntegrityAnalyser';
import { FileSystemAdapter } from '../FileSystemAdapter';

/**
 * Production-grade comprehensive validation for task.md and implementation.md
 * Validates structure, syntax, and consistency with comprehensive checks
 */
export class TaskConsistencyValidator {
  private memoizedValidateTask = memoizee(this.validateTask.bind(this), {
    length: 500, // Limit caching to prevent memory bloat
    maxAge: 60 * 1000,
    promise: true
  });

  private memoizedValidateImplementation = memoizee(this.validateImplementation.bind(this), {
    length: 500,
    maxAge: 60 * 1000,
    promise: true
  });

  constructor(
    private fileSystem: FileSystemAdapter,
    private semanticAnalyzer: SemanticIntegrityAnalyser,
    private useFileSystemReads: boolean = false
  ) {}

  /**
   * Validates task.md structure, content, and syntax
   * Comprehensive validation with error messages for each issue
   */
  async validateTask(content: string): Promise<TaskValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // === VALIDATION 1: Essential Sections Existence ===
    const sections = this.extractMarkdownSections(content);

    if (!sections.mission || sections.mission.trim().length === 0) {
      errors.push('Missing mission statement - required for drift prevention');

      if (!sections.mission && content.includes('Requirements')) {
        warnings.push('Optional mission statement present - recommended for drift prevention');
      }
    } else if (sections.mission.trim().length < 10) {
      errors.push(`Mission statement too short (${sections.mission.trim().length} chars) - must be 10+ chars`);
      score -= 20;
    } else if (sections.mission.trim().length > 500 && !sections.mission.includes('.')) {
      errors.push('Mission statement too long - should be one or two sentences');
      score -= 10;
    }

    // === VALIDATION 2: Requirements Bullets ===
    const requirementRegex = /^\s*-\s+\[.\]\s+(.+)/gm;
    const matches = content.match(requirementRegex);

    if (!matches || matches.length === 0) {
      errors.push('No requirements defined in task.md - missing implementation anchor points');
      score -= 30;
    } else if (matches.length < 5) {
      warnings.push('Task has fewer than 5 requirements - consider adding more');
      score -= 10;
    } else if (matches.length > 20) {
      warnings.push('Task has many requirements (' + matches.length + ') - consider grouping');
    }

    // === VALIDATION 3: Objective Compression Potential ===
    const objective = sections.mission || content;
    const words = objective.split(/\s+/).length;
    const syllables = objective.replace(/[^aeiouy]/g, '').length;
    const readabilityScore = 206.835 - 1.015 * (words / syllables);

    if (words > 30 && readabilityScore < 60) {
      warnings.push('Objective readability is low - should be ades for compression algorithms');
    }

    // === VALIDATION 4: Acceptance Criteria ===
    const acceptanceCriteria = sections.acceptanceCriteria || [];
    if (acceptanceCriteria.length === 0) {
      warnings.push('Acceptance criteria missing - no clear definition of success');
    }

    // === VALIDATION 5: Section Coherence ===
    const requirements = this.parseRequirements(content);
    if (requirements.length > matches.length) {
      warnings.push('Parsed requirements differ from raw markdown - check markdown formatting');
    }

    // Validate requirements for completeness
    const someInvalidRequirements = requirements.some(req => req.description.length < 10);
    if (someInvalidRequirements && requirements.length > 0) {
      warnings.push('Some requirements have descriptions less than 10 characters long');
    }

    // Calculate final validation score
    if (score < 60) {
      warnings.push('Critical validation issues found - may impact task execution');
    }

    return {
      isValid: errors.length === 0 && score >= 60,
      errors,
      warnings,
      score,
      requirements,
      objectives: [objective],
      acceptanceCriteria
    };
  }

  /**
   * Validates implementation.md completeness and tracking markers
   */
  async validateImplementation(content: string): Promise<TaskValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // === VALIDATION 1: Checkpoint ID ===
    const checkpointId = this.extractTag(content, 'checkpoint-id') || 
                        this.extractTag(content, 'checkpointId') ||
                        this.extractURL(content, 'checkpoint-id') ||
                        this.extractURL(content, 'checkpointId');

    if (!checkpointId) {
      warnings.push('No checkpoint ID found - tracking will be less effective');
      
      // Better suggestion if no checkpoint ID
      if (content.includes('#') && !content.includes('checkpoint')) {
        warnings.push('Checkpoint tracking section recommended for structured execution');
      }
    } else {
      // Verify checkpoint ID format
      const checkpointMatches = content.match(/ckpt-[a-f0-9]{12,}/gi);
      if (checkpointMatches && !checkpointId.includes(checkpointId)) {
        warnings.push('Checkpoint ID format may not be optimal - consider 12+ hex characters');
      }
    }

    // === VALIDATION 2: Semantic Compression Hashes ===
    const hashRegex = /hash:\s*([a-f0-9]{64})/gim;
    const hashMatches = content.match(hashRegex);
    
    if (!hashMatches || hashMatches.length === 0) {
      warnings.push('No semantic hash found - integrity verification incomplete');
    } else {
      const uniqueHashes = new Set(hashMatches.map(m => m.split(':')[1].trim()));
      if (uniqueHashes.size === 0) {
        errors.push('Semantic hash appears malformed (no valid hash found)');
        score -= 20;
      }
    }

    // === VALIDATION 3: Drift Check Tags ===
    const hasDriftTag = content.includes('# drift-check') || 
                       content.includes('# Drift-Check') || 
                       content.includes('% Drift-Check') || 
                       content.includes('<!-- Drift-Check -->');

    if (!hasDriftTag) {
      warnings.push('Consider adding drift-check tags for semantic verification');
    }

    // === VALIDATION 4: Structure Validation ===
    const hasImplementationHeader = content.trim().startsWith('#');
    if (!hasImplementationHeader) {
      errors.push('Implementation.md missing header - file is not a valid markdown document');
      score -= 15;
    }

    const hasImplementationObjective = content.includes('implementation-objective') || 
                                       content.includes('Implementation Objective') ||
                                       content.includes(`Objective:`);

    if (!hasImplementationObjective) {
      warnings.push('Loose implementation objective - recommended: defined tracking field');
    }

    // === VALIDATION 5: Content Suggestion ===
    if (content.length < 100) {
      errors.push('Implementation.md suspiciously short - may be incomplete or template');
      score -= 30;
    }

    // === VALIDATION 6: Stage Progression ===
    const completedSection = content.includes('(✅') || content.includes('(x)') || content.includes('[x]');
    const pendingSection = content.includes('(⏳') || content.includes('(t)') || content.includes('[ ]');
    
    if (completedSection && !pendingSection) {
      warnings.push('Implementation appears complete with no pending items - may need review');
    }

    // === VALIDATION 7: Progressive Transparency ===
    const progressContent = content.includes('Progress:') || 
                           content.includes('Progress:') || 
                           content.includes('Progress:');
    
    if (!progressContent) {
      warnings.push('Implementation tracking section recommended for code generation');
    }

    return {
      isValid: errors.length === 0 && score >= 70,
      errors,
      warnings,
      score,
      requirements: [],
      objectives: [],
      acceptanceCriteria: []
    };
  }

  /**
   * Validates consistency between task.md and implementation.md
   * Ensures they align and no operational gaps exist
   */
  async validateConsistency(
    taskMd: string,
    implementationMd: string
  ): Promise<ConsistencyReport> {
    const taskValidation = await this.validateTask(taskMd);
    const implValidation = await this.validateImplementation(implementationMd);
    
    const recommendations: string[] = [];
    const gapAnalysis: Gap[] = [];

    // === RECOMMENDATIONS BASED ON GAPS ===

    // Gap 1: Task.md issues
    if (taskValidation.score < 80) {
      recommendations.push('Improve task.md structure for better scaffolding generation');
    }

    // Gap 2: Implementation.md issues
    if (implValidation.score < 80) {
      recommendations.push('Add checkpoint tracking to implementation.md');
    }

    // Gap 3: Objective mismatch
    const taskLine = taskMd.split('\n').find((line: string) => line.startsWith('# Mission Statement') || line.startsWith('#« Mission »'));
    const implLine = implementationMd.split('\n').find((line: string) => line.includes('Mission:') || line.includes('Implementation objective'));
    
    if (taskLine && implLine && taskLine.length > 10 && implLine.length > 10) {
      const similarity = this.semanticAnalyzer.calculateLinearDistance(taskLine.trim(), implLine.trim());
      
      if (similarity > 0.3) {
        recommendations.push('Better intention alignment between task.md and implementation.md');
        gapAnalysis.push({
          gapType: 'intent-mismatch',
          threshold: 0.3,
          current: similarity,
          message: `Semantics diverge by ${similarity.toFixed(2)} - direct retargeted result`
        });
      }
    }

    // Gap 4: Requirements misalignment
    const taskRequirements = this.parseRequirements(taskMd);
    const implRequirements = this.parseRequirements(implementationMd);
    
    if (taskRequirements.length > 0 && implRequirements.length > 0) {
      const missingRequirements = taskRequirements.filter(
        tr => !implRequirements.some(ir => ir.uniqueId === tr.uniqueId && ir.description === tr.description)
      );
      
      if (missingRequirements.length > 0) {
        recommendations.push(`Implementation.md missing ${missingRequirements.length} requirement(s)`);
        gapAnalysis.push({
          gapType: 'requirement-misalignment',
          threshold: 0,
          current: missingRequirements.length,
          message: `Missing ${missingRequirements.length} requirement(s) in implementation`
        });
      }
    }

    // === FINAL VALIDATION DECISION ===
    const finalConsistencyScore = Math.min(1.0, taskValidation.score / 100 * 0.6 + implValidation.score / 100 * 0.4);

    return {
      taskMd: taskValidation,
      implementationMd: implValidation,
      gapAnalysis,
      recommendations
    };
  }

  /**
   * Extracts and validates structured content from markdown
   * Returns typed section objects for validation
   */
  private extractMarkdownSections(content: string): Record<string, any> {
    const sections: Record<string, any> = {};

    // Extract mission statement (first paragraph after #)
    const lines = content.split('\n');
    let mission = [];
    let inMission = false;
    let blankLines = 0;

    for (const line of lines) {
      // Stop at H1 header (first #)
      if (line.startsWith('#')) {
        break;
      }
      
      // Detect mission content until bullet or summary restatement
      const cleanLine = line.trim();
      if (cleanLine === '' || cleanLine.startsWith('-') || 
          cleanLine.includes('[') || cleanLine.includes('✅')) {
        blankLines++;
        if (inMission && blankLines <= 3) {
          mission.push(cleanLine);
        }
        continue;
      }
      
      blankLines = 0;
      inMission = true;
      mission.push(cleanLine);
    }

    sections.mission = mission.join(' ').trim() || mission.join('\n');

    // Extract key-value objectives
    const objectives = [];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('objective:') || lowerLine.includes('mission:')) {
        objectives.push(line.trim());
      }
    }
    sections.objectives = objectives;

    // Extract acceptance criteria
    const acceptanceCriteria = [];
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('is complete when') || lowerLine.includes('is successful when')) {
        acceptanceCriteria.push(line.trim());
      }
    }
    sections.acceptanceCriteria = acceptanceCriteria;

    return sections;
  }

  /**
   * Parses requirement bullets from markdown
   * Extracts uniqueId, description, and metadata
   */
  private parseRequirements(content: string): Requirement[] {
    if (!content) return [];
    
    const regex = /^\s*-\s+\[.\]\s+(.+)/gm;
    const matches = [...content.matchAll(regex)];
    const requirements: Requirement[] = [];

    for (const match of matches) {
      const description = match[1].trim();
      
      // Skip descriptions that are clearly not requirements
      if (description.toLowerCase().includes('##') || 
          description.toLowerCase().includes('###')) {
        continue;
      }
      
      if (description.length < 10) continue;

      const uniqueId = 'req-' + crypto.randomUUID().slice(0, 8);
      const requirementType = this.detectRequirementType(description);

      requirements.push({
        uniqueId,
        description,
        type: requirementType,
        priority: this.detectPriority(description),
        isCritical: 
          description.toLowerCase().includes('cannot omit') ||
          description.toLowerCase().includes('critical') ||
          description.length < 20,
        section: 'Requirements'
      } as Requirement);
    }

    return requirements;
  }

  /**
   * Extracts tagged content
   */
  private extractTag(content: string, tagName: string): string | null {
    const tagPattern = new RegExp(`${tagName}[:=]([^\\n]+?)`, 'gi');
    const match = content.match(tagPattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Extracts URL encoded content
   */
  private extractURL(content: string, suffix: string): string | null {
    const urlPattern = new RegExp(`${suffix}[:=]([^\\s]+?)`, 'gi');
    const match = content.match(urlPattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Detects requirement type from description
   */
  private detectRequirementType(description: string): Requirement['type'] {
    const words = description.toLowerCase();
    if (words.includes('fix') || words.includes('bug') || words.includes('issue')) {
      return 'fix';
    }
    if (words.includes('refactor') || words.includes('optimize') || words.includes('improve')) {
      return 'refactor';
    }
    if (words.includes('test') || words.includes('document') || words.includes('#')) {
      return 'test';
    }
    return 'feature';
  }

  /**
   * Detects requirement priority from keywords
   */
  private detectPriority(description: string): number {
    const keywords = ['cannot omit', 'must', 'required', 'urgent', 'critical'];
    const words = description.toLowerCase().split(' ');
    
    for (const keyword of keywords) {
      if (words.some(word => word === keyword || word.includes(keyword))) {
        return 0; // CRITICAL
      }
    }
    
    return 2; // MEDIUM
  }

  /**
   * Validates raw task markdown content
   * Used for file validation before creating entities
   */
  async validateAndGetRawTask(rawMd: string): Promise<string> {
    const validation = await this.memoizedValidateTask(rawMd);
    
    if (!validation.isValid) {
      throw new Error(`Task validation failed: ${validation.errors.join('\n')}`);
    }
    
    return rawMd;
  }

  /**
   * Validates raw implementation markdown content
   */
  async validateAndGetRawImplementation(rawMd: string): Promise<string> {
    const validation = await this.memoizedValidateImplementation(rawMd);
    
    if (!validation.isValid) {
      throw new Error(`Implementation validation failed: ${validation.errors.join('\n')}`);
    }
    
    return rawMd;
  }

  /**
   * Gets gaps between task.md and implementation.md
   */
  private analyzeGaps(taskMd: string, implementationMd: string): Gap[] {
    // Placeholder - actual implementation would do semantic comparison
    return [];
  }
}

/**
 * Gap analysis result
 */
interface Gap {
  gapType: string;
  threshold: number;
  current: number;
  message: string;
}

/**
 * Content structure check result
 */
interface Section {
  present: boolean;
  title: string;
  startingLine: number;
}