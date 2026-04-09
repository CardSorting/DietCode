/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as path from 'node:path';
import { EventType } from '../../domain/Event';
import { AttachmentParser } from '../../domain/context/Attachment';
import type { Attachment } from '../../domain/context/Attachment';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { Filesystem } from '../../domain/system/Filesystem';
import type { EventBus } from '../orchestration/EventBus';

/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

export class AttachmentResolver {
  constructor(
    private filesystem: Filesystem,
    private eventBus?: EventBus,
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
          content: { type: 'error', message: `File not found: ${tag.path}` },
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
            entries: entries.map((e) => ({ path: e.name, isDir: e.isDirectory })),
          },
        };
        attachments.push(attachment);
        this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, {
          path: tag.path,
          type: 'directory_listing',
        });
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
                totalLines: tag.range.end - tag.range.start + 1,
                isPruned: false,
                originalLineCount: tag.range.end - tag.range.start + 1,
              },
            },
          };
          attachments.push(attachment);
          this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, {
            path: tag.path,
            type: 'file_content',
          });
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
                totalLines: lines.length,
                isPruned: false,
                originalLineCount: lines.length,
              },
            },
          };
          attachments.push(attachment);
          this.eventBus?.publish(EventType.ATTACHMENT_RESOLVED, {
            path: tag.path,
            type: 'file_content',
          });
        }
      }
    }

    return attachments;
  }
}
