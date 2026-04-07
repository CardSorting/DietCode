/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for message attachments (images, file snippets, directory listings).
 */

export interface Location {
  start?: number;
  end?: number;
}

export interface FileInfo {
  path: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  isPruned: boolean;
  originalLineCount?: number;
}

export type AttachmentContent =
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'file_content'; content: string; info: FileInfo }
  | { type: 'directory_listing'; entries: Array<{ path: string; isDir: boolean }> }
  | { type: 'error'; message: string };

export interface Attachment {
  content: AttachmentContent;
  path: string;
}

export interface ParsedTag {
  path: string;
  range?: { start: number; end: number };
}

export class AttachmentParser {
  private constructor() {}

  /**
   * Identifies markup tags in the format @[path/to/file:start-end].
   * Ported from forge_domain/src/attachment.rs.
   */
  static parseTags(text: string): ParsedTag[] {
    const tags: ParsedTag[] = [];
    const regex = /@\[([^\]]+)\]/g;
    let match = regex.exec(text);
    while (match !== null) {
      const fullPath = match[1];
      if (fullPath) {
        if (fullPath.includes(':')) {
          const parts = fullPath.split(':');
          const path = parts[0];
          const rangeStr = parts[1];

          if (path && rangeStr) {
            const rangeMatch = rangeStr.match(/(\d+)-(\d+)/);
            if (rangeMatch?.[1] && rangeMatch[2]) {
              tags.push({
                path,
                range: {
                  start: Number.parseInt(rangeMatch[1], 10),
                  end: Number.parseInt(rangeMatch[2], 10),
                },
              });
            } else {
              tags.push({ path: fullPath });
            }
          } else {
            tags.push({ path: fullPath });
          }
        } else {
          tags.push({ path: fullPath });
        }
      }
      match = regex.exec(text);
    }
    return tags;
  }
}
