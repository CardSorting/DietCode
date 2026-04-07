/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Handles slash-commands and routing.
 * Parses user input to identify and execute internal commands.
 */

import type { CommandDefinition } from '../../domain/agent/CommandDefinition';

export class CommandProcessor {
  private commands: Map<string, CommandDefinition> = new Map();

  registerCommand(command: CommandDefinition) {
    this.commands.set(command.name, command);
    for (const alias of command.aliases || []) {
      this.commands.set(alias, command);
    }
  }

  isCommand(input: string): boolean {
    return input.startsWith('/');
  }

  async process(input: string): Promise<boolean> {
    const [commandName, ...args] = input.slice(1).split(' ');
    if (!commandName) return false;
    const command = this.commands.get(commandName);

    if (command) {
      await command.execute();
      return true;
    }

    return false;
  }

  getAvailableCommands(): string[] {
    return Array.from(new Set(this.commands.values())).map((c) => `/${c.name}`);
  }
}
