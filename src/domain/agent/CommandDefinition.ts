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
