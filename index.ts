#!/usr/bin/env bun
/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { AgentRegistry } from './src/core/capabilities/AgentRegistry';
import { CommandProcessor } from './src/core/capabilities/CommandProcessor';
import { SkillLoader } from './src/core/capabilities/SkillLoader';
import { ToolManager } from './src/core/capabilities/ToolManager';
import { AttachmentResolver } from './src/core/context/AttachmentResolver';
import { ContextPruner } from './src/core/context/ContextPruner';
import { ContextService } from './src/core/context/ContextService';
import { DiscoveryService } from './src/core/context/DiscoveryService';
import { Ignorer } from './src/core/context/Ignorer';
import { IntegrityService } from './src/core/integrity/IntegrityService';
import { SelfHealingService } from './src/core/integrity/SelfHealingService';
import { MemoryService } from './src/core/memory/MemoryService';
import { EventBus } from './src/core/orchestration/EventBus';
import { HandoverService } from './src/core/orchestration/HandoverService';
import { Registry, SERVICES } from './src/core/orchestration/Registry';
import { Orchestrator } from './src/core/orchestration/orchestrator';
import type { ProjectContext } from './src/domain/context/ProjectContext';
import { LogLevel } from './src/domain/logging/LogLevel';
import { IntegrityPolicy } from './src/domain/memory/IntegrityPolicy';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';
import { NodeSystemAdapter } from './src/infrastructure/NodeSystemAdapter';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { SqliteAuditRepository } from './src/infrastructure/database/SqliteAuditRepository';
import { SqliteDecisionRepository } from './src/infrastructure/database/SqliteDecisionRepository';
import { SqliteHealingRepository } from './src/infrastructure/database/SqliteHealingRepository';
import { SqliteKnowledgeRepository } from './src/infrastructure/database/SqliteKnowledgeRepository';
import { SqliteSessionRepository } from './src/infrastructure/database/SqliteSessionRepository';
import { AnthropicProvider } from './src/infrastructure/llm/providers/AnthropicProvider';
import { CloudflareProvider } from './src/infrastructure/llm/providers/CloudflareProvider';
import { QueueWorker } from './src/infrastructure/queue/QueueWorker';
import {
  createListFilesTool,
  createReadFileTool,
  createReadRangeTool,
  createWriteFileTool,
} from './src/infrastructure/tools/fileTools';
import { createGrepTool } from './src/infrastructure/tools/grep';
import { createMkdirTool } from './src/infrastructure/tools/mkdir';
import { TerminalUI } from './src/ui/terminal';
import { BootstrapService } from './src/core/setup/BootstrapService';
import { supportsUnicode } from './src/ui/design/Theme';
import chalk from 'chalk';

async function main() {
  // Handle compatibility flags before anything else
  if (process.argv.includes('--no-unicode')) {
    process.env.DIETCODE_NO_UNICODE = 'true';
  }
  if (process.argv.includes('--cinematic')) {
    process.env.DIETCODE_FORCE_UNICODE = 'true';
  }

  if (process.argv.includes('--diagnose')) {
    console.log(chalk.yellow('[ NEURAL_DIAGNOSTICS ]'));
    console.log(`  PLATFORM  : ${process.platform}`);
    console.log(`  LC_ALL    : ${process.env.LC_ALL}`);
    console.log(`  LC_CTYPE  : ${process.env.LC_CTYPE}`);
    console.log(`  LANG      : ${process.env.LANG}`);
    console.log(`  TERM      : ${process.env.TERM}`);
    console.log(`  TERM_PROG : ${process.env.TERM_PROGRAM}`);
    console.log('');
  }

  const isUnicode = supportsUnicode();
  const mode = isUnicode ? 'SOVEREIGN_UNICODE' : 'AXIOM_ASCII';
  const colorSupport = chalk.level > 0 ? (chalk.level > 2 ? 'TRUECOLOR' : '256_COLOR') : 'NO_COLOR';
  
  console.log(chalk.gray('[ NEURAL_HANDSHAKE: INITIALIZED ]'));
  console.log(chalk.gray(`  INTERFACE : ${mode}`));
  console.log(chalk.gray(`  VISUALS   : ${colorSupport}`));
  console.log(chalk.gray(`  LOCALE    : ${process.env.LANG || 'UNKNOWN'}`));
  console.log('');

  // Initialize logger with proper dependency injection
  const logger = new ConsoleLoggerAdapter();
  logger.setMinLevel(LogLevel.INFO);

  // Initialize UI (terminal adapter implements Domain TerminalInterface)
  const terminalAdapter = new NodeTerminalAdapter(logger);
  const ui = new TerminalUI(terminalAdapter);

  // Initialize Core Infrastructure
  const fs = new FileSystemAdapter();

  // Initialize Database infrastructure BEFORE Bootstrap to avoid circular dependency
  await SovereignDb.init('./data/diet-code-sovereign.db');

  // Triple Down: Sovereign Onboarding & Setup
  const bootstrap = new BootstrapService(fs, ui);
  const config = await bootstrap.bootstrap();

  const apiKey = config.anthropicApiKey;
  const cfAccountId = config.cloudflareAccountId;
  const cfApiToken = config.cloudflareApiToken;

  const systemAdapter = new NodeSystemAdapter(fs, logger);

  const repository = new SqliteSessionRepository();
  const decisions = new SqliteDecisionRepository();
  const audit = new SqliteAuditRepository();
  const knowledge = new SqliteKnowledgeRepository();
  const healingRepo = new SqliteHealingRepository();

  // Connect Observability Partitions (Bridge to EventBus)
  // SqliteAuditRepository will automatically listen via EventBus subscription pattern

  // LLM Provider
  let provider: any;
  if (cfAccountId && cfApiToken) {
    console.log('[CORE] Initializing Cloudflare Workers AI (@cf/moonshotai/kimi-k2.5)');
    provider = new CloudflareProvider({
      accountId: cfAccountId,
      apiToken: cfApiToken,
      logService: logger,
    });
  } else {
    console.log('[CORE] Initializing Anthropic Provider');
    if (!apiKey) {
      ui.logError('Anthropic API Key is missing. This should have been caught by bootstrap.');
      process.exit(1);
    }
    provider = new AnthropicProvider(apiKey, logger);
  }

  // Triple Down: Sovereign Memory & Swarm Handover
  const agentRegistry = new AgentRegistry();
  const memoryService = new MemoryService(knowledge, provider, agentRegistry, logger);
  const handoverService = new HandoverService(repository, { sessionId: 'test' });
  const selfHealingService = new SelfHealingService(healingRepo, logger); // Fixed types

  // Background Worker: Sovereign Queue
  const worker = new QueueWorker(
    decisions,
    memoryService,
    selfHealingService,
    agentRegistry,
    provider,
    logger as any,
  );
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
  const integrityPolicy = new IntegrityPolicy();
  const integrityAdapter = new IntegrityAdapter(integrityPolicy, logger);
  const integrityService = new IntegrityService(integrityAdapter, undefined, logger);
  const integrityReport = await integrityService.scan(projectContext.repository.path);
  // Calculate health score from violation severity (0-100 scale)
  const score = Math.max(0, 100 - integrityReport.violations.length * 10);
  console.log(`[INTEGRITY] Core Health: ${score}/100`);

  // Triple Down: Autonomous Self-Healing Assessment
  if (integrityReport.violations.length > 0) {
    const tasks = await selfHealingService.triage(integrityReport);
    if (tasks !== undefined && tasks !== null) {
      console.log(`[HEALING] Sovereign Swarm enqueued ${tasks} self-healing tasks.`);
    }
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
  const specializedAgents = agentRegistry
    .getAllAgents()
    .filter((a) => a.id !== 'agent-dietcode')
    .map((a) => `- ${a.title} (${a.id}): ${a.def.description ?? ''}`)
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
Follow the JoyZoning architecture for all operations.`,
    model: cfAccountId ? '@cf/moonshotai/kimi-k2.5' : 'claude-3-7-sonnet-20250219',
    maxTokens: 4096,
  });

  registry.register(SERVICES.FS, fs);
  registry.register(SERVICES.LLM, provider);
  registry.register(SERVICES.UI, ui);
  registry.register(SERVICES.DATABASE, SovereignDb);
  registry.register(SERVICES.REPOSITORY, repository);
  registry.register(SERVICES.DECISIONS_REPOSITORY, decisions);
  registry.register(SERVICES.QUEUE, await SovereignDb.db());
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
    projectContext,
    memoryService,
  );

  // Final Activation
  ui.logSuccess(`Sovereign Hive Active. Ready for command, ${chalk.yellow.bold('Sovereign Administrator')}.`);

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
