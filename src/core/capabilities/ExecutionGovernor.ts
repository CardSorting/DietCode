/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Executors task execution with automatic retry logic
 */

/**
 * Task definition with an execute function
 */
export interface TaskDefinition {
  id: string;
  execute: () => Promise<unknown>;
}

/**
 * Custom error type for retryable task execution failures
 */
export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

/**
 * Configuration for execution governor behavior
 */
export interface ExecutionGovernorConfig {
  maxRetries: number;
  retryableErrors: string[];
  timeoutMs: number;
}

export interface TaskExecutionRequest {
  task: TaskDefinition;
  groupId?: string;
  priority?: number;
  attempts?: number; // Added attempts property
}

/**
 * Execution status tracking
 */
export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  result?: unknown;
  error?: ExecutionError;
  startTime?: number;
  endTime?: number;
}

// Registry for task queues by execution group
const executionQueues = new Map<string, TaskExecutionRequest[]>();

function addTaskToQueue(task: TaskExecutionRequest): void {
  const group = task.groupId || 'default';
  const groupQueue = executionQueues.get(group);

  if (groupQueue) {
    const updatedQueue: TaskExecutionRequest[] = [];
    const taskPriority = task.priority;

    // Filter to get items with lower priority
    const itemsWithLowerPriority = groupQueue.filter(
      (t) => t.priority !== undefined && taskPriority !== undefined && t.priority < taskPriority,
    );

    // Filter to get items with higher or equal priority
    const itemsWithHigherOrEqualPriority = groupQueue.filter(
      (t) => !(t.priority !== undefined && taskPriority !== undefined && t.priority < taskPriority),
    );

    // Add new task after lower priority items, before higher or equal priority items
    itemsWithLowerPriority.push(task);
    updatedQueue.push(...itemsWithHigherOrEqualPriority);

    executionQueues.set(group, updatedQueue);
  } else {
    executionQueues.set(group, [{ ...task, attempts: 0 }]);
  }
}

function dequeueTask(group: string): TaskExecutionRequest | undefined {
  const queue = executionQueues.get(group);
  if (!queue || queue.length === 0) {
    return undefined;
  }
  const [next] = queue;
  executionQueues.delete(group);
  return next;
}

// Configuration for execution governor behavior
const defaultExecutionGovernorConfig: ExecutionGovernorConfig = {
  maxRetries: 3,
  retryableErrors: ['NetworkError', 'TimeoutError', 'ConnectionError', 'SQLITE_BUSY'],
  timeoutMs: 30000,
};

// Execution status tracking
const runningTasks = new Set<string>();
const statusRegistry = new Map<string, TaskStatus>();

/**
 * Governor that coordinates task execution with automatic retry logic
 */
export class ExecutionGovernor {
  private static config: ExecutionGovernorConfig = defaultExecutionGovernorConfig;

  /**
   * Instance method for task execution (delegates to static)
   */
  async execute(request: TaskExecutionRequest): Promise<unknown> {
    return ExecutionGovernor.execute(request);
  }

  /**
   * Configure execution governor behavior
   */
  static configure(config: Partial<ExecutionGovernorConfig>): void {
    ExecutionGovernor.config = { ...ExecutionGovernor.config, ...config };
  }

  /**
   * Execute a task with automatic retry logic
   */
  static async execute(request: TaskExecutionRequest): Promise<unknown> {
    if (runningTasks.has(request.task.id)) {
      throw new ExecutionError(`Task ${request.task.id} is already running`);
    }

    const task = statusRegistry.get(request.task.id);

    if (task) {
      task.status = 'running';
      task.startTime = Date.now();
      runningTasks.add(request.task.id);
    }

    try {
      const result = await ExecutionGovernor.executeWithRetry(request);
      return result;
    } finally {
      if (task) {
        task.endTime = Date.now();
        task.status = 'failed';
        runningTasks.delete(request.task.id);
      }
    }
  }

  /**
   * Execute a single attempt with retry logic
   */
  private static async executeWithRetry(
    request: TaskExecutionRequest,
    attempts = 0,
  ): Promise<unknown> {
    const timeoutMs = ExecutionGovernor.config.timeoutMs;
    const error = new Error('Unknown error');
    let currentAttempts = attempts;

    while (currentAttempts <= ExecutionGovernor.config.maxRetries) {
      try {
        const result = await Promise.race([
          request.task.execute(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TimeoutError')), timeoutMs),
          ),
        ]);

        return result;
      } catch (err: unknown) {
        const errObj = err instanceof Error ? err : new Error(String(err));
        error.message = errObj.message;

        if (!ExecutionGovernor.isRetryableError(error)) {
          throw new ExecutionError(error.message, false);
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, currentAttempts * 1000));
        currentAttempts++;
      }
    }

    throw new ExecutionError('Max retries reached', true);
  }

  /**
   * Determine if an error should trigger retry
   */
  private static isRetryableError(error: Error): boolean {
    return ExecutionGovernor.config.retryableErrors.some((retryable) =>
      error.message.includes(retryable),
    );
  }

  /**
   * Check execution status of a task
   */
  static getStatus(taskId: string): TaskStatus | undefined {
    return statusRegistry.get(taskId);
  }

  /**
   * Cancel a running task
   */
  static cancel(taskId: string): boolean {
    if (!runningTasks.has(taskId)) {
      return false;
    }

    const status = statusRegistry.get(taskId);
    if (status) {
      status.status = 'cancelled';
      runningTasks.delete(taskId);
    }
    return true;
  }

  /**
   * Get all running tasks
   */
  static getRunningTasks(): string[] {
    return Array.from(runningTasks);
  }
}
