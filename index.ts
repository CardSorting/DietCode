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
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { SqliteSessionRepository } from './src/infrastructure/database/SqliteSessionRepository';
import { SqliteDecisionRepository } from './src/infrastructure/database/SqliteDecisionRepository';
import { AgentRegistry } from './src/core/AgentRegistry';
import { QueueWorker } from './src/infrastructure/queue/QueueWorker';
import type { ProjectContext } from './src/domain/ProjectContext';

async function main() {
  const ui = new TerminalUI();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    ui.logError('ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  // Initialize Database infrastructure
  await SovereignDb.init();
  const repository = new SqliteSessionRepository();
  const decisions = new SqliteDecisionRepository();

  // Background Worker: Sovereign Queue
  const worker = new QueueWorker(decisions);
  await worker.start();

  // Project Context Discovery (Deep Integration)
  const projectContext: ProjectContext = {
    workspaceId: 'workspace-dietcode-prod',
    repoId: 'dietcode-v1',
    repoPath: '/Users/bozoegg/Downloads/DietCode',
    defaultBranch: 'main',
  };

  const fs = new FileSystemAdapter();
  const provider = new AnthropicProvider(apiKey);

  const registry = Registry.getInstance();
  const agentRegistry = new AgentRegistry();

  // Register default agent
  agentRegistry.register({
    id: 'agent-dietcode',
    title: 'DietCode Assistant',
    description: 'A minimalist, architecturally pure AI coding assistant.',
    systemPrompt: 'You are DietCode, a minimalist coding assistant. You follow the JoyZoning architecture.',
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 4096,
  });

  registry.register(SERVICES.FS, fs);
  registry.register(SERVICES.LLM, provider);
  registry.register(SERVICES.UI, ui);
  registry.register(SERVICES.DATABASE, SovereignDb);
  registry.register(SERVICES.REPOSITORY, repository);
  registry.register(SERVICES.DECISIONS_REPOSITORY, decisions);
  registry.register(SERVICES.QUEUE, await SovereignDb.getQueue());
  registry.register(SERVICES.AGENT_REGISTRY, agentRegistry);

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

  const orchestrator = new Orchestrator(
    provider, 
    ui, 
    toolManager, 
    commandProcessor, 
    repository,
    decisions,
    agentRegistry,
    projectContext
  );

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
