/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the grep tool.
 * Wraps system grep/ripgrep or implements a simple search.
 * Hardened with a pure Node.js fallback.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';

export const grepTool: ToolDefinition<{ pattern: string; targetPath?: string }> = {
  name: 'grep',
  description: 'Search for a pattern in file contents using ripgrep or grep.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The regular expression pattern to search for.',
      },
      targetPath: {
        type: 'string',
        description: 'The directory or file to search in (defaults to .).',
      },
    },
    required: ['pattern'],
  },
  async execute({ pattern, targetPath = '.' }): Promise<ToolResult> {
    try {
      // 1. Try ripgrep
      try {
        const output = execSync(`rg -n "${pattern}" "${targetPath}"`, { encoding: 'utf8' });
        return { content: output };
      } catch (e) {}

      // 2. Try grep
      try {
        const output = execSync(`grep -rn "${pattern}" "${targetPath}"`, { encoding: 'utf8' });
        return { content: output };
      } catch (e) {}

      // 3. Pure Node.js fallback
      const results: string[] = [];
      const regex = new RegExp(pattern);

      const walk = (dir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') walk(fullPath);
          } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, i) => {
              if (regex.test(line)) {
                results.push(`${fullPath}:${i + 1}:${line}`);
              }
            });
          }
        }
      };

      walk(targetPath);
      return { content: results.length > 0 ? results.join('\n') : 'No matches found.' };

    } catch (error: any) {
      return {
        content: `Error running grep: ${error.message}`,
        isError: true,
      };
    }
  },
};
