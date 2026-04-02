import * as path from 'path';
import type { SystemContext, ExtensionStat } from '../../domain/context/SystemContext';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { Filesystem } from '../../domain/system/Filesystem';

/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

export class ContextService {
  constructor(private filesystem: Filesystem) {}

  /**
   * Gathers comprehensive system context for the given project.
   */
  async gather(project: ProjectContext): Promise<SystemContext> {
    const root = project.repository.path as string;
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
      const ext = path.extname(file.path).slice(1) || 'no-extension';
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

  /**
   * Get a session by session ID
   */
  async getSessionBySessionId(sessionId: string): Promise<ProjectContext | undefined> {
    return undefined;
  }

  /**
   * Prune session context (clean up old session data)
   */
  async pruneSessionContext(): Promise<void> {
    // Placeholder - implementation depends on StorageAdapter
  }
}
