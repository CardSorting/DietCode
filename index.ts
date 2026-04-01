import { Orchestrator } from './src/core/orchestration/orchestrator';
import { AnthropicProvider } from './src/infrastructure/llm/anthropicProvider';
import { TerminalUI } from './src/ui/terminal';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import { ToolManager } from './src/core/capabilities/ToolManager';
import { CommandProcessor } from './src/core/capabilities/CommandProcessor';
import { createReadFileTool, createWriteFileTool, createReadRangeTool, createListFilesTool } from './src/infrastructure/tools/fileTools';
import { createGrepTool } from './src/infrastructure/tools/grep';
import { createMkdirTool } from './src/infrastructure/tools/mkdir';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';

import { Registry, SERVICES } from './src/core/orchestration/Registry';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { SqliteSessionRepository } from './src/infrastructure/database/SqliteSessionRepository';
import { SqliteDecisionRepository } from './src/infrastructure/database/SqliteDecisionRepository';
import { SqliteHealingRepository } from './src/infrastructure/database/SqliteHealingRepository';
import { AgentRegistry } from './src/core/capabilities/AgentRegistry';
import { QueueWorker } from './src/infrastructure/queue/QueueWorker';
import { DiscoveryService } from './src/core/context/DiscoveryService';
import { ContextService } from './src/core/context/ContextService';
import { AttachmentResolver } from './src/core/context/AttachmentResolver';
import { SkillLoader } from './src/core/capabilities/SkillLoader';
import { SqliteAuditRepository } from './src/infrastructure/database/SqliteAuditRepository';
import { SqliteKnowledgeRepository } from './src/infrastructure/database/SqliteKnowledgeRepository';
import { NodeSystemAdapter } from './src/infrastructure/NodeSystemAdapter';
import { EventBus } from './src/core/orchestration/EventBus';
import { Ignorer } from './src/core/context/Ignorer';
import { ContextPruner } from './src/core/context/ContextPruner';
import { IntegrityService } from './src/core/integrity/IntegrityService';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';
import { HandoverService } from './src/core/orchestration/HandoverService';
import { MemoryService } from './src/core/memory/MemoryService';
import { SelfHealingService } from './src/core/integrity/SelfHealingService';
import type { ProjectContext } from './src/domain/context/ProjectContext';
import { LogLevel } from './src/domain/logging/LogLevel';

async function main() {
  // Initialize logger with proper dependency injection
  const logger = new ConsoleLoggerAdapter();
  logger.setMinLevel(LogLevel.INFO);
  
  // Initialize UI (terminal adapter implements Domain TerminalInterface)
  const terminalAdapter = new NodeTerminalAdapter(logger);
  const ui = new TerminalUI(terminalAdapter);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    ui.logError('ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }

  // Initialize Core Infrastructure
  const fs = new FileSystemAdapter();
  const systemAdapter = new NodeSystemAdapter(fs, logger);

  // Initialize Database infrastructure
  await SovereignDb.init();
  const repository = new SqliteSessionRepository();
  const decisions = new SqliteDecisionRepository();
  const audit = new SqliteAuditRepository();
  const knowledge = new SqliteKnowledgeRepository();
  const healingRepo = new SqliteHealingRepository();
  
  // Connect Observability Partitions (Bridge to EventBus)
  // SqliteAuditRepository will automatically listen via EventBus subscription pattern

  // LLM Provider
  const provider = new AnthropicProvider(apiKey, logger);

  // Triple Down: Sovereign Memory & Swarm Handover
  const agentRegistry = new AgentRegistry();
  const memoryService = new MemoryService(knowledge, provider, agentRegistry, logger);
  const handoverService = new HandoverService(agentRegistry, repository, logger);
  const selfHealingService = new SelfHealingService(healingRepo as any, logger);

  // Background Worker: Sovereign Queue
  const worker = new QueueWorker(decisions, memoryService, selfHealingService, agentRegistry, provider, logger);
  await worker.start();

  // Project Context Discovery (Deep Integration)
  const discovery = new DiscoveryService(fs, systemAdapter, logger);
  const projectContext = await discovery.discover(process.cwd());

  // Performance & Context Services
  const ignorer = new Ignorer(fs, projectContext.repository.path, logger);
  const pruner = new ContextPruner();
  const contextService = new ContextService(fs);
  const attachmentResolver = new AttachmentResolver(fs, EventBus.getInstance(logger));
  const skillLoader = new SkillLoader(fs, logger);

  // Triple Down: Architectural Integrity Guard
  const integrityAdapter = new IntegrityAdapter(fs);
  const integrityService = new IntegrityService(integrityAdapter, logger);
  const integrityReport = await integrityService.scan(projectContext.repository.path);
  console.log(`[INTEGRITY] Core Health: ${integrityReport.score}/100`);

  // Triple Down: Autonomous Self-Healing Assessment
  if (integrityReport.violations.length > 0) {
      const tasks = await selfHealingService.triage(integrityReport);
      console.log(`[HEALING] Sovereign Swarm enqueued ${tasks} self-healing tasks.`);
  }

  // Load custom skills
  const skills = await skillLoader.load(projectContext);
  console.log(`[CORE] Loaded ${skills.length} skills from .dietcode/skills/`);

  const registry = Registry.getInstance();

  // 1. Register specialized skills as agents
  for (const skill of skills) {
    agentRegistry.register({
      id: skill.metadata?.id || `agent-${skill.name.toLowerCase().replace(/\s+/g, '-')}`,
      title: skill.name,
      description: skill.description,
      systemPrompt: skill.prompt,
    });
  }

  // 2. Register default "Swarm Router" agent
  const specializedAgents = agentRegistry.getAllAgents()
    .filter(a => a.id !== 'agent-dietcode')
    .map(a => `- ${a.title} (${a.id}): ${a.def.description ?? ''}`)
    .join('\n');

  agentRegistry.register({
    id: 'agent-dietcode',
    title: 'DietCode Router',
    description: 'The central orchestrator of the Sovereign Swarm.',
    systemPrompt: `You are DietCode, the central router of a Sovereign Swarm. 
Your mission is to orchestrate complex tasks by coordinating specialized agents.

[SOVEREIGN SWARM]
Available specialists:
${specializedAgents}

[SWARM RULES]
1. If a task requires deep architectural review, suggest handing over to 'agent-architect'.
2. If a task involves extensive refactoring or dead code pruning, suggest 'agent-refactorer'.
3. If a task involves sensitive secrets or security audits, suggest 'agent-security'.
4. To request a handover, output: "[HANDOVER: agent-id] Reason for handover".

Follow the JoyZoning architecture for all operations.`,
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
  toolManager.register(createReadFileTool(fs));
  toolManager.register(createWriteFileTool(fs));
  toolManager.register(createReadRangeTool(fs));
  toolManager.register(createListFilesTool(fs));
  toolManager.register(createGrepTool(fs));
  toolManager.register(createMkdirTool(fs));

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
    audit,
    agentRegistry,
    contextService,
    attachmentResolver,
    pruner,
    ignorer,
    handoverService,
    memoryService,
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
