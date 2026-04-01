import * as path from 'path';
import type { SystemContext, ExtensionStat } from '../domain/SystemContext';
import type { ProjectContext } from '../domain/ProjectContext';
import type { Filesystem } from '../domain/Filesystem';

export class ContextService {
  constructor(private filesystem: Filesystem) {}

  /**
   * Gathers comprehensive system context for the given project.
   */
  async gather(project: ProjectContext): Promise<SystemContext> {
    const root = project.repository.path;
    const stats = this.getFileStats(root);
    const activeBranch = this.filesystem.getBranch(root);
    
    return {
      cwd: root,
      filesSummary: {
        stats: stats.extensionStats,
        totalFiles: stats.totalFiles,
      },
      activeBranch,
      availableSkills: [], // Will be populated by SkillLoader
      toolsEnabled: true,
    };
  }

  private getFileStats(root: string): { extensionStats: ExtensionStat[], totalFiles: number } {
    const counts: Record<string, number> = {};
    const files = this.filesystem.walk(root);
    const totalFiles = files.length;

    for (const file of files) {
      const ext = path.extname(file).slice(1) || 'no-extension';
      counts[ext] = (counts[ext] || 0) + 1;
    }

    const extensionStats: ExtensionStat[] = Object.entries(counts)
      .map(([extension, count]) => ({
        extension,
        count,
        percentage: totalFiles > 0 ? ((count / totalFiles) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count);

    return { extensionStats, totalFiles };
  }
}
