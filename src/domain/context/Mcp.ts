/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for MCP (Model Context Protocol).
 * Ported from forge_domain/src/mcp.rs.
 */

export interface McpStdioServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
  timeout?: number;
  disable?: boolean;
}

export interface McpHttpServer {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  disable?: boolean;
}

export type McpServerConfig =
  | { type: 'stdio'; config: McpStdioServer }
  | { type: 'http'; config: McpHttpServer };

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}
