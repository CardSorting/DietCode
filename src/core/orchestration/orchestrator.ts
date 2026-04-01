/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

import type { LLMProvider } from '../../domain/LLMProvider';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';
import type { SessionState, Message, MessageBlock } from '../../domain/context/SessionState';
import { createInitialState } from '../../domain/context/SessionState';
import type { ToolManager } from '../capabilities/ToolManager';
import type { CommandProcessor } from '../capabilities/CommandProcessor';
import { DomainError } from '../../domain/Errors';
import type { SessionRepository } from '../../domain/context/SessionRepository';
import type { DecisionRepository } from '../../domain/memory/DecisionRepository';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { Reasoning } from '../../domain/memory/Reasoning';
import type { AuditProvider } from '../../domain/system/AuditProvider';
import type { AgentRegistry } from '../capabilities/AgentRegistry';
import type { Agent } from '../../domain/agent/Agent';
import type { ContextService } from '../context/ContextService';
import { AttachmentResolver } from '../context/AttachmentResolver';
import { EventBus } from './EventBus';
import { EventType } from '../../domain/Event';
import type { ContextPruner } from '../context/ContextPruner';
import type { Ignorer } from '../context/Ignorer';
import type { HandoverService } from './HandoverService';
import type { MemoryService } from '../memory/MemoryService';

export class Orchestrator {
  private state: SessionState;
  private currentSessionId: string | null = null;
  private agent: Agent;
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private provider: LLMProvider,
    private ui: TerminalInterface,
    private toolManager: ToolManager,
    private commandProcessor: CommandProcessor,
    private repository: SessionRepository,
    private decisions: DecisionRepository,
    private audit: AuditProvider,
    private agentRegistry: AgentRegistry,
    private contextService: ContextService,
    private attachmentResolver: AttachmentResolver,
    private pruner: ContextPruner,
    private ignorer: Ignorer,
    private handoverService: HandoverService,
    private memoryService: MemoryService,
    private project: ProjectContext
  ) {
    const defaultAgent = this.agentRegistry.getAgent(this.agentRegistry.defaultAgentId);
    if (!defaultAgent) {
      throw new Error(`Default agent ${this.agentRegistry.defaultAgentId} not found`);
    }
    this.agent = defaultAgent;
    this.state = createInitialState(this.agent.systemPrompt);
  }

  async run(userInput: string) {
    try {
      if (this.commandProcessor.isCommand(userInput)) {
        await this.commandProcessor.process(userInput);
        return;
      }

      this.eventBus.emit(EventType.PROMPT_RECEIVED, { userInput });

      // 1. Context Enrichment
      const systemContext = await this.contextService.gather(this.project);
      
      // 1b. Sovereign Memory Recall
      const relevantKnowledge = await this.memoryService.recall(userInput);
      const knowledgePrompt = this.memoryService.formatForPrompt(relevantKnowledge);

      const enhancedSystemPrompt = `${this.agent.systemPrompt}${knowledgePrompt}\n\n[WORKSPACE CONTEXT]\nRoot: ${systemContext.cwd}\nFiles: ${systemContext.filesSummary.totalFiles} across ${systemContext.filesSummary.stats.length} extensions.\nTop extensions: ${systemContext.filesSummary.stats.slice(0, 5).map((s: { extension: string; count: number }) => `${s.extension} (${s.count})`).join(', ')}`;

      // Update state with enriched prompt
      this.state.systemPrompt = enhancedSystemPrompt;

      // 2. Initialize Hive environment
      await this.repository.ensureProject(this.project, 'user-default');

      // 3. Initialize session if not already done
      if (!this.currentSessionId) {
        this.currentSessionId = await this.repository.createSession(
          'user-default',
          this.agent.id,
          userInput.slice(0, 50) + '...'
        );
        this.eventBus.emit(EventType.SESSION_STARTED, { sessionId: this.currentSessionId, agentId: this.agent.id });
      }

      const sessionId = this.currentSessionId!;

      // 4. Resolve Attachments from User Input Markup
      let attachments = await this.attachmentResolver.resolve(userInput, this.project);
      
      // 5. Triple Down: Cognitive Pruning
      const originalCount = attachments.length;
      attachments = this.pruner.prune(attachments);
      this.eventBus.emit(EventType.PRUNING_COMPLETED, {
        originalCount,
        prunedCount: attachments.length,
        sessionId
      });

      const userMessageBlocks: MessageBlock[] = [{ type: 'text', text: userInput }];
      
      for (const attachment of attachments) {
        if (attachment.content.type === 'file_content') {
           userMessageBlocks.push({
             type: 'text',
             text: `[ATTACHMENT: ${attachment.path}]\n${attachment.content.content}`
           });
        } else if (attachment.content.type === 'directory_listing') {
           userMessageBlocks.push({
             type: 'text',
             text: `[DIRECTORY: ${attachment.path}]\n${attachment.content.entries.map((e: { path: string; isDir: boolean }) => `${e.isDir ? '[DIR] ' : '[FILE] '}${e.path}`).join('\n')}`
           });
        }
      }

      const userMessage: Message = { 
        role: 'user', 
        content: userMessageBlocks,
        timestamp: new Date().toISOString()
      };

      this.state.messages.push(userMessage);
      await this.repository.appendMessage(sessionId, userMessage);

      while (true) {
        let response;
        try {
          this.eventBus.emit(EventType.THINKING_STARTED, { sessionId });
          response = await this.provider.createMessage(
            this.agent,
            this.state.messages,
            this.toolManager.getAllTools(),
            { taskId: sessionId }
          );
          this.eventBus.emit(EventType.THINKING_COMPLETED, { sessionId });
        } catch (error: any) {
          this.ui.logError(`LLM failure: ${error.message}`);
          await this.repository.updateSessionStatus(sessionId, 'failed', { error: error.message });
          break;
        }

        const assistantMessage: Message = { 
          role: 'assistant', 
          content: response.content as any,
          reasoning: response.reasoning,
          timestamp: new Date().toISOString()
        };
        this.state.messages.push(assistantMessage);
        await this.repository.appendMessage(sessionId, assistantMessage);

        const toolCalls = response.content.filter(
          (c: any): c is any => c.type === 'tool_use'
        );

        if (toolCalls.length > 0 || response.reasoning) {
            // Audit Log: Reasoning & Tool Strategy
            await this.audit.recordAction({
              sessionId,
              agentId: this.agent.id,
              action: toolCalls.length > 0 ? 'tool_execution' : 'response_generation',
              reasoning: response.reasoning || [],
              metadata: { toolCalls: toolCalls.map(tc => tc.name) }
            });

          // Deep Integration: Rationale Persistence (Decision Audit)
          const rationale = response.content.find((c: any) => c.type === 'text')?.text || 'Automatic tool selection';
          await this.decisions.recordDecision(
            sessionId,
            this.agent.id,
            this.project.repository.path,
            JSON.stringify(toolCalls.map(tc => tc.name)),
            rationale
          );
        }

        if (toolCalls.length === 0) {
          const text = response.content.find((c: any): c is any => c.type === 'text')?.text;
          if (text) {
            // 6. Triple Down: Swarm Handover Detection
            const handoverMatch = text.match(/\[HANDOVER:\s*([^\]]+)\](?:\s*(.*))?/i);
            if (handoverMatch) {
                const targetAgentId = handoverMatch[1]?.trim();
                const reason = handoverMatch[2]?.trim() || 'No reason provided';
                
                if (targetAgentId) {
                  const newAgent = this.agentRegistry.getAgent(targetAgentId);
                  if (newAgent) {
                    this.eventBus.emit(EventType.HANDOVER_INITIATED, {
                      fromAgentId: this.agent.id,
                      toAgentId: targetAgentId,
                      reason,
                      sessionId
                    });
                    await this.handoverService.handover(sessionId, this.agent.id, targetAgentId, reason);
                    this.agent = newAgent;
                  }
                }
            }

            // Sovereignty Pass: OFF-LOADED to background queue via standardized event
            if (text.toLowerCase().includes('success') || text.toLowerCase().includes('completed')) {
              this.eventBus.emit(EventType.KNOWLEDGE_GAINED, {
                userId: 'user-default',
                type: 'task_outcome',
                content: `Successfully completed task: ${userInput}\nOutcome: ${text}`,
                metadata: { taskId: sessionId, repoPath: this.project.repository.path }
              });
              this.ui.logClaude('[SYSTEM] Background knowledge ingestion triggered.');
            }
          }
          this.eventBus.emit(EventType.RESPONSE_GENERATED, { sessionId, text });
          await this.repository.updateSessionStatus(sessionId, 'done');
          break;
        }

        const results: MessageBlock[] = [];
        for (const call of toolCalls) {
          this.ui.logToolUse(call.name, call.input);
          const result = await this.toolManager.executeTool(call.name, call.input);
          
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: result.content,
            is_error: result.isError,
          });
        }

        const toolResultMessage: Message = {
          role: 'user',
          content: results,
          timestamp: new Date().toISOString()
        };

        this.state.messages.push(toolResultMessage);
        await this.repository.appendMessage(sessionId, toolResultMessage);
      }
    } catch (error: any) {
      if (error instanceof DomainError) {
        this.ui.logError(error.message);
      } else {
        this.ui.logError(`Unexpected error: ${error.message}`);
      }
      this.eventBus.emit(EventType.ERROR_OCCURRED, { error: error.message, sessionId: this.currentSessionId });
      if (this.currentSessionId) {
        await this.repository.updateSessionStatus(this.currentSessionId, 'error', { error: error.message });
      }
    }
  }
}
