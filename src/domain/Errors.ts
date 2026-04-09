/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure Domain-level errors for orchestrating logic.
 * Resilient to infrastructure changes.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ToolExecutionError extends DomainError {
  constructor(toolName: string, message: string) {
    super(`Error executing tool '${toolName}': ${message}`, 'TOOL_EXECUTION_FAILED');
  }
}

export class LLMProviderError extends DomainError {
  constructor(message: string) {
    super(`LLM Provider failure: ${message}`, 'LLM_PROVIDER_FAILED');
  }
}

export class FilesystemError extends DomainError {
  constructor(path: string, message: string) {
    super(`Filesystem error at '${path}': ${message}`, 'FILESYSTEM_FAILED');
  }
}
