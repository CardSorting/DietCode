import * as path from 'node:path';
import { EventType } from '../../domain/Event';
import type { Skill } from '../../domain/agent/Skill';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { LogService } from '../../domain/logging/LogService';
import type { Filesystem } from '../../domain/system/Filesystem';
import { EventBus } from '../orchestration/EventBus';

/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 * Uses structured logging for production-grade observability.
 */

export class SkillLoader {
  private eventBus: EventBus;

  constructor(
    private filesystem: Filesystem,
    private logService: LogService,
    eventData?: { sessionId?: string; timestamp?: string },
  ) {
    this.eventBus = EventBus.getInstance(undefined as never);
  }

  /**
   * Loads all skills from the project's skill directory.
   */
  async load(project: ProjectContext): Promise<Skill[]> {
    const skillsDir = path.join(project.repository.path, '.dietcode', 'skills');

    if (!this.filesystem.exists(skillsDir)) {
      return [];
    }

    const entries = this.filesystem.readdir(skillsDir);
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (entry.name.endsWith('.md')) {
        const fullPath = path.join(skillsDir, entry.name);
        const skillName = path.parse(entry.name).name;

        try {
          const content = this.filesystem.readFile(fullPath);
          const { metadata, prompt } = this.parseMarkdown(content);

          // Validation: Ensure minimum required fields
          if (!prompt || prompt.length < 5) {
            this.logService.warn(
              'Skipping skill: Prompt too short or missing',
              { skillName, promptLength: prompt.length },
              { component: 'SkillLoader' },
            );
            continue;
          }

          const skill: Skill = {
            name: metadata?.name || skillName,
            description: metadata?.description || `Custom skill: ${skillName}`,
            prompt: prompt,
            metadata: metadata,
            path: fullPath,
          };

          skills.push(skill);
          this.eventBus.emit(EventType.SKILL_LOADED, { name: skill.name, path: fullPath });
        } catch (e) {
          this.logService.error(
            'Failed to load skill',
            { skillName, error: (e as Error).message },
            { component: 'SkillLoader' },
          );
        }
      }
    }

    return skills;
  }

  /**
   * Parses YAML front matter from a markdown string.
   */
  private parseMarkdown(content: string): { metadata: Record<string, unknown>; prompt: string } {
    const lines = content.split('\n').map((l) => l.trimEnd());
    if (lines.length === 0) return { metadata: {}, prompt: '' };

    const firstLine = lines[0];
    if (!firstLine || firstLine.trim() !== '---') return { metadata: {}, prompt: content };

    const metadata: Record<string, unknown> = {};
    let promptStart = 0;

    let index = 0;
    for (const line of lines) {
      index++;
      if (line === undefined) continue;

      const trimmed = line.trim();
      if (trimmed === '---') {
        promptStart = index;
        break;
      }

      const parts = line.split(':');
      if (parts.length < 2) continue;

      const key = parts[0];
      const val = parts.slice(1).join(':').trim();

      if (key) {
        let cleanVal = val;
        // Strip surrounding quotes if present
        if (
          (cleanVal.startsWith('"') && cleanVal.endsWith('"')) ||
          (cleanVal.startsWith("'") && cleanVal.endsWith("'"))
        ) {
          cleanVal = cleanVal.slice(1, -1);
        }
        metadata[key.trim()] = cleanVal;
      }
    }

    return {
      metadata,
      prompt: lines.slice(promptStart).join('\n').trim(),
    };
  }
}
