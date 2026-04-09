import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type * as vscode from 'vscode';
import { McpClient } from './McpClient';

export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

/**
 * [LAYER: INFRASTRUCTURE]
 * Manages discovery and configuration of MCP servers.
 */
export class McpDiscoveryService extends EventEmitter {
  private static instance: McpDiscoveryService;
  private _context?: vscode.ExtensionContext;
  private _servers: Map<string, McpServerConfig> = new Map();
  private _clients: Map<string, McpClient> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): McpDiscoveryService {
    if (!McpDiscoveryService.instance) {
      McpDiscoveryService.instance = new McpDiscoveryService();
    }
    return McpDiscoveryService.instance;
  }

  public initialize(context: vscode.ExtensionContext) {
    this._context = context;
    this._loadServers();
  }

  private _loadServers() {
    if (!this._context) return;

    const saved = this._context.globalState.get<McpServerConfig[]>('mcp_servers', []);
    this._servers.clear();
    for (const server of saved) {
      this._servers.set(server.id, server);
    }
  }

  public getServers(): McpServerConfig[] {
    return Array.from(this._servers.values());
  }

  public async addServer(config: McpServerConfig) {
    this._servers.set(config.id, config);
    await this._saveServers();
    this.emit('serversChanged', this.getServers());
  }

  public async toggleServer(id: string, enabled: boolean) {
    const server = this._servers.get(id);
    if (server) {
      server.enabled = enabled;
      await this._saveServers();
      this.emit('serversChanged', this.getServers());
    }
  }

  public async deleteServer(id: string) {
    if (this._servers.delete(id)) {
      await this._saveServers();
      this.emit('serversChanged', this.getServers());
    }
  }

  private async _saveServers() {
    if (!this._context) return;
    await this._context.globalState.update('mcp_servers', this.getServers());
  }

  public async getClient(id: string): Promise<McpClient> {
    const existing = this._clients.get(id);
    if (existing) return existing;

    const config = this._servers.get(id);
    if (!config) {
      throw new Error(`MCP Server with ID ${id} not found`);
    }

    if (!config.enabled) {
      throw new Error(`MCP Server ${config.name} is disabled`);
    }

    const client = new McpClient(id, config.command, config.args || [], config.env || {});
    await client.start();
    this._clients.set(id, client);
    return client;
  }

  public async stopClient(id: string) {
    const client = this._clients.get(id);
    if (client) {
      await client.stop();
      this._clients.delete(id);
    }
  }

  public async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const client = await this.getClient(serverId);
    return await client.call('call_tool', { name: toolName, arguments: args });
  }

  /**
   * Returns a curated catalog of recommended Sovereign MCP servers.
   */
  public getCatalog(): any[] {
    return [
      {
        id: 'brave-search',
        name: 'Brave Search',
        description: 'Web search capabilities via Brave Search API.',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
        env_vars: ['BRAVE_API_KEY'],
      },
      {
        id: 'sqlite',
        name: 'SQLite Explorer',
        description: 'Direct SQL access to local databases with schema analysis.',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite'],
        env_vars: [],
      },
      {
        id: 'playwright',
        name: 'Browser Automation (Playwright)',
        description: 'Interactive browser control and screenshot capabilities.',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-playwright'],
        env_vars: [],
      },
      {
        id: 'filesystem',
        name: 'Local Filesystem',
        description: 'Secure, focus-aware file operations with watch support.',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        env_vars: [],
      },
    ];
  }
}
