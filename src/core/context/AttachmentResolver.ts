import * as path from 'path';
import { AttachmentParser } from '../../domain/context/Attachment';
import type { Attachment } from '../../domain/context/Attachment';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { Filesystem } from '../../domain/system/Filesystem';
import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';

/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

export class AttachmentResolver {
  constructor(
    private filesystem: Filesystem,
    private eventBus?: EventBus
  ) {}

  /**
   * Resolves all @[path] tags in a text string into formal Attachment objects.
   */
  async resolve(text: string, project: ProjectContext): Promise<Attachment[]> {
    const tags = AttachmentParser.parseTags(text);
    const attachments: Attachment[] = [];

    for (const tag of tags) {
      const fullPath = path.resolve(project.repository.path, tag.path);
      
      if (!this.filesystem.exists(fullPath)) {
        const attachment: Attachment = {
          path: tag.path,
          content: { type: 'error', message: `File not found: ${tag.path}` }
        };
        attachments.push(attachment);
        this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, { path: tag.path, type: 'error' });
        continue;
      }

      const stat = this.filesystem.stat(fullPath);
      
      if (stat.isDirectory) {
         const entries = this.filesystem.readdir(fullPath);
         const attachment: Attachment = {
           path: tag.path,
           content: {
             type: 'directory_listing',
             entries: entries.map(e => ({ path: e.name, isDir: e.isDirectory }))
           }
         };
         attachments.push(attachment);
         this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, { path: tag.path, type: 'directory_listing' });
      } else if (stat.isFile) {
        if (tag.range) {
          const content = this.filesystem.readRange(fullPath, tag.range.start, tag.range.end);
          const attachment: Attachment = {
            path: tag.path,
            content: {
              type: 'file_content',
              content: content,
              info: {
                path: tag.path,
                startLine: tag.range.start,
                endLine: tag.range.end,
                totalLines: 0 // Could be gathered if needed
              }
            }
          };
          attachments.push(attachment);
          this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, { path: tag.path, type: 'file_content' });
        } else {
          const content = this.filesystem.readFile(fullPath);
          const lines = content.split('\n');
          
          const attachment: Attachment = {
            path: tag.path,
            content: {
              type: 'file_content',
              content: content,
              info: {
                path: tag.path,
                startLine: 1,
                endLine: lines.length,
                totalLines: lines.length
              }
            }
          };
          attachments.push(attachment);
          this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, { path: tag.path, type: 'file_content' });
        }
      }
    }

    return attachments;
  }
}
