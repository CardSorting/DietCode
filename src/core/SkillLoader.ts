import * as path from 'path';
import type { Skill } from '../domain/Skill';
import type { ProjectContext } from '../domain/ProjectContext';
import type { Filesystem } from '../domain/Filesystem';

export class SkillLoader {
  constructor(private filesystem: Filesystem) { }

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
        const content = this.filesystem.readFile(fullPath);

        const { metadata, prompt } = this.parseMarkdown(content);

        skills.push({
          name: (metadata && metadata.name) || skillName,
          description: (metadata && metadata.description) || `Custom skill: ${skillName}`,
          prompt: prompt,
          metadata: metadata,
          path: fullPath
        });
      }
    }

    return skills;
  }

  /**
   * Parses YAML front matter from a markdown string.
   */
  private parseMarkdown(content: string): { metadata: Record<string, any>, prompt: string } {
    const lines = content.split('\n').map(l => l.trimEnd());
    const firstLine = lines[0];
    if (!firstLine || firstLine.trim() !== '---') return { metadata: {}, prompt: content };

    const metadata: Record<string, any> = {};
    let promptStart = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      
      const trimmed = line.trim();
      if (trimmed === '---') {
        promptStart = i + 1;
        break;
      }
      
      const parts = line.split(':');
      const key = parts[0];
      const vals = parts.slice(1);
      
      if (key && vals.length > 0) {
        let val = vals.join(':').trim();
        // Strip surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        metadata[key.trim()] = val;
      }
    }

    return {
      metadata,
      prompt: lines.slice(promptStart).join('\n').trim(),
    };
  }
}
