import * as path from 'path';
import type { Skill } from '../domain/Skill';
import type { ProjectContext } from '../domain/ProjectContext';
import type { Filesystem } from '../domain/Filesystem';

export class SkillLoader {
  constructor(private filesystem: Filesystem) {}

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
        const name = path.parse(entry.name).name;
        const content = this.filesystem.readFile(fullPath);
        
        skills.push({
          name,
          description: `Custom skill: ${name}`,
          prompt: content,
          path: fullPath
        });
      }
    }

    return skills;
  }
}
