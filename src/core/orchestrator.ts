/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

import { LLMProvider } from '../domain/LLMProvider';
import { TerminalInterface } from '../domain/TerminalInterface';
import { SessionState, createInitialState, Message, ToolResult as ToolResultState } from '../domain/SessionState';
import { ToolManager } from './ToolManager';
import { CommandProcessor } from './CommandProcessor';
import { DomainError } from '../domain/Errors';

export class Orchestrator {
  private state: SessionState;

  constructor(
    private provider: LLMProvider,
    private ui: TerminalInterface,
    private toolManager: ToolManager,
    private commandProcessor: CommandProcessor
  ) {
    this.state = createInitialState('You are DietCode, a minimalist coding assistant.');
  }

  async run(userInput: string) {
    try {
      if (this.commandProcessor.isCommand(userInput)) {
        await this.commandProcessor.process(userInput);
        return;
      }

      this.state.messages.push({ role: 'user', content: userInput });

      while (true) {
        let response;
        try {
          response = await this.provider.createMessage(
            this.state.messages,
            this.toolManager.getAllTools()
          );
        } catch (error: any) {
          this.ui.logError(`LLM failure: ${error.message}`);
          break;
        }

        this.state.messages.push({ role: 'assistant', content: response.content });

        const toolCalls = response.content.filter(
          (c): c is any => c.type === 'tool_use'
        );

        if (toolCalls.length === 0) {
          const text = response.content.find((c): c is any => c.type === 'text')?.text;
          if (text) this.ui.logClaude(text);
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

        this.state.messages.push({
          role: 'user',
          content: results.map(r => ({
            type: 'tool_result',
            tool_use_id: r.tool_use_id,
            content: r.content,
            is_error: r.isError
          })) as any
        });
      }
    } catch (error: any) {
      if (error instanceof DomainError) {
        this.ui.logError(error.message);
      } else {
        this.ui.logError(`Unexpected error: ${error.message}`);
      }
    }
  }
}
