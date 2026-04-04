/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — implements Domain contracts
 * Violations: None
 */

import type {
  ToolDefinition,
  ToolRouter,
  ToolRoutingResult,
  ToolSelectionPolicy,
  UserIntention,
} from '../../domain/capabilities/ToolRouter';

/**
 * Infrastructure implementation of Tool-Routing pattern
 * Pattern: "Tool routing: read={file-read}, edit={file-edit}, create={file-write}, exec={shell-execution}"
 */
export class ToolRouterAdapter implements ToolRouter {
  private toolDefinitions: Map<string, ToolDefinition>;
  private selectionPolicy: ToolSelectionPolicy;

  constructor(availableTools: ToolDefinition[] = []) {
    // Convert Infrastructure tool definitions to Domain contracts
    this.toolDefinitions = new Map(
      availableTools.map((tool) => [
        tool.name,
        {
          id: tool.id,
          name: tool.name,
          operationType: this.mapOperationType(tool.operationType),
          soloUseOnly: tool.soloUseOnly,
          parallelizable: tool.parallelizable,
          provenance: 'builtin',
        },
      ]),
    );

    this.selectionPolicy = {
      canUseSolo: (tool: ToolDefinition) => tool.soloUseOnly,
      canUseParallel: (tool: ToolDefinition) => tool.parallelizable,
      getMaxParallelLimit: (operationType: string) => (operationType === 'EXECUTE_SHELL' ? 1 : 10),
    };
  }

  /**
   * Route user intention to appropriate tool
   * Implements priority dispatch based on action type
   */
  async route(intention: UserIntention): Promise<ToolRoutingResult> {
    // Normalize operation type
    const normalizedOp = this.normalizeOperationType(intention.operationType);

    // Find tool that matches the operation type
    const tool = Array.from(this.toolDefinitions.values()).find(
      (tool) => tool.operationType === normalizedOp,
    );

    if (!tool) {
      throw new Error(`No tool available for operation type: ${intention.operationType}`);
    }

    return {
      tool,
      matchesCriteria: true,
      overrideShell: this.shouldOverrideShell(intention.operationType),
    };
  }

  /**
   * Check if a specific tool is available
   */
  hasTool(toolName: string): boolean {
    return this.toolDefinitions.has(toolName);
  }

  /**
   * Get all available tool names
   */
  getAllToolNames(): string[] {
    return Array.from(this.toolDefinitions.keys());
  }

  /**
   * Map specialized operation types to tool operations
   */
  private mapOperationType(ops: string): string {
    const typeMap: Record<string, string> = {
      READ_FILE: 'READ',
      WRITE_FILE: 'WRITE',
      EDIT_FILE: 'EDIT',
      DELETE_FILE: 'DELETE',
      EXECUTE_SHELL: 'EXECUTE',
      COMMAND: 'EXECUTE',
      debug: 'EXECUTE',
      test: 'EXECUTE',
      build: 'EXECUTE',
      grep_search: 'SEARCH_GREP',
      glob_find: 'SEARCH_GLOB',
      find_file: 'SEARCH_GLOB',
      search: 'SEARCH_GREP',
      file_info: 'INFO',
    };

    return typeMap[ops] || 'GENERIC';
  }

  /**
   * Normalize operation type for routing lookup
   */
  private normalizeOperationType(op: string): string {
    // Capitalize and handle aliases
    return op.toUpperCase().replace(/_/g, '_').replace(/-/g, '_').trim();
  }

  /**
   * Determine whether to override shell execution
   * Pattern: "Purpose-built tools give user better visibility, make review easier"
   */
  private shouldOverrideShell(operationType: string): boolean {
    // Any file operation should use dedicated tool, not shell
    if (['READ_FILE', 'WRITE_FILE', 'EDIT_FILE'].includes(this.mapOperationType(operationType))) {
      return true;
    }

    // Any search operation should use dedicated tool, not grep/find
    if (['SEARCH_GREP', 'SEARCH_GLOB'].includes(this.mapOperationType(operationType))) {
      return true;
    }

    // Web operations should use dedicated tools
    if (['WEB_SEARCH', 'WEB_FETCH', 'NETWORK'].includes(this.mapOperationType(operationType))) {
      return true;
    }

    // Return true for critical operations that should be audited
    if (
      ['INFRASTRUCTURE_CONFIG', 'DEPLOY', 'BACKUP', 'RESTORE'].includes(
        this.mapOperationType(operationType),
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Implementation of ToolSelectionPolicy
   */
  private getSelectionPolicy(): ToolSelectionPolicy {
    return this.selectionPolicy;
  }

  /**
   * Get the selection policy for external use
   */
  getPolicy(): ToolSelectionPolicy {
    return this.selectionPolicy;
  }

  /**
   * Validate route decision based on policy
   */
  validateRouteDecision(decision: ToolRoutingResult): boolean {
    if (!decision.tool) return false;

    const policy = this.selectionPolicy;

    // Never recommend shell for file operations
    if (
      decision.tool.operationType === 'READ' ||
      decision.tool.operationType === 'WRITE' ||
      decision.tool.operationType === 'EDIT' ||
      decision.tool.operationType === 'DELETE'
    ) {
      return decision.overrideShell === true;
    }

    // Check parallelizability based on policy
    return policy.canUseParallel(decision.tool) || policy.canUseSolo(decision.tool);
  }
}
