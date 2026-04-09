/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as child_process from 'node:child_process';
import * as readline from 'node:readline';
import { EventEmitter } from 'node:events';
import { Logger } from '../../shared/services/Logger';

export interface McpRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number | string;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * [LAYER: INFRASTRUCTURE]
 * Handles execution and JSON-RPC communication with an MCP server process.
 */
export class McpClient extends EventEmitter {
  private process: child_process.ChildProcess | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number | string, { resolve: (val: any) => void, reject: (err: Error) => void }>();
  private rl: readline.Interface | null = null;

  constructor(
    public readonly serverId: string,
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly env: Record<string, string> = {}
  ) {
    super();
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = child_process.spawn(this.command, this.args, {
          env: { ...process.env, ...this.env },
          shell: true
        });

        this.process.on('error', (err) => {
          Logger.error(`[MCP:${this.serverId}] Process error`, { error: err });
          reject(err);
        });

        this.process.on('exit', (code) => {
          Logger.warn(`[MCP:${this.serverId}] Process exited with code ${code}`);
          this.emit('exit', code);
        });

        if (this.process.stdout) {
          this.rl = readline.createInterface({
            input: this.process.stdout,
            terminal: false
          });

          this.rl.on('line', (line) => {
            this.handleMessage(line);
          });
        }

        if (this.process.stderr) {
          this.process.stderr.on('data', (data) => {
            Logger.debug(`[MCP:${this.serverId}:stderr] ${data.toString()}`);
          });
        }

        // Wait a bit to ensure it's running
        setTimeout(resolve, 500);
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  public async call(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('MCP Client not started');
    }

    const id = this.nextId++;
    const request: McpRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  private handleMessage(line: string) {
    try {
      const response: McpResponse = JSON.parse(line);
      const pending = this.pendingRequests.get(response.id);

      if (pending) {
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
        this.pendingRequests.delete(response.id);
      } else {
        // Handle notifications or out-of-band messages
        this.emit('notification', response);
      }
    } catch (error) {
      Logger.error(`[MCP:${this.serverId}] Failed to parse message`, { line, error });
    }
  }
}
