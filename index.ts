import { Orchestrator } from './src/core/orchestrator';
import { AnthropicProvider } from './src/infrastructure/llm/anthropicProvider';
import { TerminalUI } from './src/ui/terminal';
import { ToolManager } from './src/core/ToolManager';
import { CommandProcessor } from './src/core/CommandProcessor';
import { createReadFileTool, createWriteFileTool } from './src/infrastructure/tools/fileTools';
import { grepTool } from './src/infrastructure/tools/grep';
import { createMkdirTool } from './src/infrastructure/tools/mkdir';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';

import { Registry, SERVICES } from './src/core/Registry';

async function main() {
  const ui = new TerminalUI();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    ui.logError('ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  const fs = new FileSystemAdapter();
  const provider = new AnthropicProvider(apiKey);

  const registry = Registry.getInstance();
  registry.register(SERVICES.FS, fs);
  registry.register(SERVICES.LLM, provider);
  registry.register(SERVICES.UI, ui);

  const toolManager = new ToolManager();
  toolManager.registerTool(createReadFileTool(fs));
  toolManager.registerTool(createWriteFileTool(fs));
  toolManager.registerTool(grepTool);
  toolManager.registerTool(createMkdirTool(fs));

  const commandProcessor = new CommandProcessor();
  commandProcessor.registerCommand({
    name: 'exit',
    description: 'Exit the application',
    execute: () => {
      ui.close();
      process.exit(0);
    },
  });
  commandProcessor.registerCommand({
    name: 'clear',
    description: 'Clear the terminal',
    execute: () => ui.clear(),
  });

  const orchestrator = new Orchestrator(provider, ui, toolManager, commandProcessor);

  const initialInput = process.argv.slice(2).join(' ');
  if (initialInput) {
    await orchestrator.run(initialInput);
  }

  // Interactive loop
  while (true) {
    const input = await ui.promptUser();
    if (input) {
      await orchestrator.run(input);
    }
  }
}

main().catch(console.error);
