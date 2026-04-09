/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure definitions for command-line slash commands.
 * No external imports or I/O.
 */

export interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  execute(): Promise<void> | void;
}

export interface CommandContext {
  command: string;
  args: string[];
}
