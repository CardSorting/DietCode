/**
 * [LAYER: CORE]
 * Principle: Orchestration — assembles pure domain context into LLM prompts.
 */

import type { Skill } from '../../domain/agent/Skill';
import type { Attachment } from '../../domain/context/Attachment';
import type { SystemContext } from '../../domain/context/SystemContext';

export class PromptService {
  /**
   * Assembles the high-fidelity system prompt for the AI agent.
   */
  assemble(context: SystemContext, skills: Skill[], attachments: Attachment[]): string {
    const sections = [
      this.getIdentityHeader(),
      this.getContextSection(context),
      this.getSkillsSection(skills),
      this.getAttachmentsSection(attachments),
      this.getRuleSection(),
    ];

    return sections.join('\n\n');
  }

  private getIdentityHeader(): string {
    return 'You are **DietCode**, a powerful, minimalist coding assistant. You excel at rapid, high-quality development with zero fluff. You are pair programming with a developer in their terminal environment.';
  }

  private getContextSection(context: SystemContext): string {
    let gitInfo = '';
    if (context.activeBranch) {
      gitInfo = `\nActive Branch: ${context.activeBranch}`;
    }

    return `### SYSTEM CONTEXT
Working Directory: ${context.cwd}${gitInfo}
File Statistics:
${context.filesSummary.stats
  .slice(0, 5)
  .map((s) => `- ${s.extension}: ${s.count} (${s.percentage}%)`)
  .join('\n')}
Total Files: ${context.filesSummary.totalFiles}
Tools Enabled: ${context.toolsEnabled ? 'YES' : 'NO'}`;
  }

  private getSkillsSection(skills: Skill[]): string {
    if (skills.length === 0) return '';
    return `### AVAILABLE SKILLS
${skills.map((s) => `- **${s.name}**: ${s.description}`).join('\n')}`;
  }

  private getAttachmentsSection(attachments: Attachment[]): string {
    if (attachments.length === 0) return '';

    const listing = attachments
      .map((a) => {
        if (a.content.type === 'file_content') {
          return `#### [ATTACHMENT: ${a.path} (Lines ${a.content.info.startLine}-${a.content.info.endLine})]
\`\`\`
${a.content.content}
\`\`\``;
        }
        if (a.content.type === 'directory_listing') {
          return `#### [DIRECTORY: ${a.path}]
${a.content.entries.map((e) => (e.isDir ? '📁 ' : '📄 ') + e.path).join('\n')}`;
        }
        if (a.content.type === 'error') {
          return `#### [ERROR: ${a.path}]
${a.content.message}`;
        }
        return '';
      })
      .join('\n\n');

    return `### ATTACHED CONTEXT\n${listing}`;
  }

  private getRuleSection(): string {
    return `### JOYZONING RULES
1. **Minimalism**: Every line of code must serve a purpose.
2. **Architecture**: Respect the [LAYER] boundaries.
3. **Safety**: Never delete files without confirming snapshots are captured.
4. **Style**: Use modern, premium TypeScript. Prefer anyhow-like error handling.`;
  }
}
