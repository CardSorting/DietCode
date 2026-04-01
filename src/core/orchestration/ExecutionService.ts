/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the tool execution lifecycle.
 */

import { EventBus } from './EventBus';
import { SnapshotService } from '../memory/SnapshotService';
import { EventType } from '../../domain/Event';

export class ExecutionService {
  constructor(
    private eventBus: EventBus,
    private snapshotService: SnapshotService
  ) {}

  /**
   * Executes a tool with full lifecycle management.
   */
  async execute<T, R>(
    toolName: string,
    args: T,
    executor: (args: T) => Promise<R>,
    filePath?: string
  ): Promise<R> {
    const correlationId = globalThis.crypto.randomUUID();
    
    // 1. Snapshot (Safety)
    if (filePath) {
      await this.snapshotService.capture(filePath);
      this.eventBus.publish(EventType.SNAPSHOT_CREATED, { filePath }, { correlationId });
    }

    // 2. Start Event
    this.eventBus.publish(EventType.TOOL_CALL_START, { toolName, args }, { correlationId });

    try {
      // 3. Execution
      const result = await executor(args);

      // 4. Success Event
      this.eventBus.publish(EventType.TOOL_CALL_SUCCESS, { toolName, result }, { correlationId });
      return result;
    } catch (error: any) {
      // 5. Failure Event
      this.eventBus.publish(EventType.TOOL_CALL_FAILURE, { toolName, error: error.message }, { correlationId });
      throw error;
    }
  }
}
