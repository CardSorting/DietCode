/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

import type { LLMProvider } from '../domain/LLMProvider';
import type { TerminalInterface } from '../domain/TerminalInterface';
import type { SessionState, Message, ToolResult as ToolResultState } from '../domain/SessionState';
import { createInitialState } from '../domain/SessionState';
import type { ToolManager } from './ToolManager';
import type { CommandProcessor } from './CommandProcessor';
import { DomainError } from '../domain/Errors';
import type { SessionRepository } from '../domain/SessionRepository';
import type { DecisionRepository } from '../domain/DecisionRepository';
import type { ProjectContext } from '../domain/ProjectContext';
import { SovereignDb } from '../infrastructure/database/SovereignDb';

export class Orchestrator {
  private state: SessionState;
  private currentSessionId: string | null = null;

  constructor(
    private provider: LLMProvider,
    private ui: TerminalInterface,
    private toolManager: ToolManager,
    private commandProcessor: CommandProcessor,
    private repository: SessionRepository,
    private decisions: DecisionRepository,
    private project: ProjectContext
  ) {
    this.state = createInitialState('You are DietCode, a minimalist coding assistant.');
  }

  async run(userInput: string) {
    try {
      if (this.commandProcessor.isCommand(userInput)) {
        await this.commandProcessor.process(userInput);
        return;
      }

      // Initialize Hive environment
      await this.repository.ensureProject(this.project, 'user-default');

      // Initialize session if not already done
      if (!this.currentSessionId) {
        this.currentSessionId = await this.repository.createSession(
          'user-default',
          'agent-dietcode',
          userInput.slice(0, 50) + '...'
        );
      }

      const sessionId = this.currentSessionId!;
      const userMessage: Message = { role: 'user', content: userInput };
      this.state.messages.push(userMessage);
      await this.repository.appendMessage(sessionId, userMessage);

      while (true) {
        let response;
        try {
          response = await this.provider.createMessage(
            this.state.messages,
            this.toolManager.getAllTools(),
            { taskId: sessionId, agentId: 'agent-dietcode' }
          );
        } catch (error: any) {
          this.ui.logError(`LLM failure: ${error.message}`);
          await this.repository.updateSessionStatus(sessionId, 'failed', { error: error.message });
          break;
        }

        const assistantMessage: Message = { role: 'assistant', content: response.content };
        this.state.messages.push(assistantMessage);
        await this.repository.appendMessage(sessionId, assistantMessage);

        const toolCalls = response.content.filter(
          (c: any): c is any => c.type === 'tool_use'
        );

        if (toolCalls.length > 0) {
          // Deep Integration: Rationale Persistence (Decision Audit)
          const rationale = response.content.find((c: any) => c.type === 'text')?.text || 'Automatic tool selection';
          await this.decisions.recordDecision(
            sessionId,
            'agent-dietcode',
            this.project.repoPath,
            JSON.stringify(toolCalls.map(tc => tc.name)),
            rationale
          );
        }

        if (toolCalls.length === 0) {
          const text = response.content.find((c: any): c is any => c.type === 'text')?.text;
          if (text) {
            this.ui.logClaude(text);
            
            // Sovereignty Pass: OFF-LOADED to background queue
            if (text.toLowerCase().includes('success') || text.toLowerCase().includes('completed')) {
              const queue = await SovereignDb.getQueue();
              await queue.enqueue({
                type: 'KNOWLEDGE_INGEST',
                data: {
                  userId: 'user-default',
                  type: 'task_outcome',
                  content: `Successfully completed task: ${userInput}\nOutcome: ${text}`,
                  metadata: { taskId: sessionId, repoPath: this.project.repoPath }
                }
              } as any);
              this.ui.logClaude('[SYSTEM] Background knowledge ingestion enqueued.');
            }
          }
          await this.repository.updateSessionStatus(sessionId, 'done');
          break;
        }

        const results: ToolResultState[] = [];
        for (const call of toolCalls) {
          this.ui.logToolUse(call.name, call.input);
          const result = await this.toolManager.executeTool(call.name, call.input);
          
          results.push({
            tool_use_id: call.id,
            content: result.content,
            isError: result.isError,
          });
        }

        const toolResultMessage: Message = {
          role: 'user',
          content: results.map(r => ({
            type: 'tool_result',
            tool_use_id: r.tool_use_id,
            content: r.content,
            is_error: r.isError
          })) as any
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
      if (this.currentSessionId) {
        await this.repository.updateSessionStatus(this.currentSessionId, 'error', { error: error.message });
      }
    }
  }
}
