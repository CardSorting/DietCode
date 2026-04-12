import * as fs from 'node:fs';
import type * as vscode from 'vscode';
import { StateSyncService } from '../../../core/manager/StateSyncService';
import { StateAssembler } from '../../../core/manager/StateAssembler';
import { Logger } from '../../../shared/services/Logger';
import type { GrpcRequest, IHandler, SendResponse } from './types';

export class StateAndUiHandler implements IHandler {
  private activeSubscriptions: Map<string, () => void> = new Map();

  constructor(private context: vscode.ExtensionContext, private sendResponse: SendResponse) {}

  dispose(request_id: string): void {
    const unsubscribe = this.activeSubscriptions.get(request_id);
    if (unsubscribe) {
        unsubscribe();
        this.activeSubscriptions.delete(request_id);
        Logger.info(`[STATE] Disposed subscription for request: ${request_id}`);
    }
  }

  async handle(method: string, request: GrpcRequest): Promise<void> {
    switch (method) {
      // State Service
      case 'subscribeToState': {
        const start = Date.now();
        // Assembly with timeout guardrail logic managed in StateSyncService
        const state = await StateAssembler.getInstance().assemble();
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            Logger.warn(`[STATE] ⚠️ Slow state assembly detected: ${duration}ms`);
        } else {
            Logger.info(`[STATE] State assembly took ${duration}ms`);
        }

        this.sendResponse(request.request_id, { stateJson: JSON.stringify(state) }, request.is_streaming);

        if (request.is_streaming) {
          // Cleanup any existing subscription for this ID first
          this.dispose(request.request_id);

          const unsubscribe = StateSyncService.getInstance().subscribe(
            request.request_id,
            (stateJson) => this.sendResponse(request.request_id, { stateJson }, true)
          );
          
          this.activeSubscriptions.set(request.request_id, unsubscribe);
        }
        break;
      }

      case 'getAvailableTerminalProfiles': {
        const shellPaths = [
          { name: 'zsh', path: '/bin/zsh' },
          { name: 'bash', path: '/bin/bash' },
          { name: 'fish', path: '/usr/local/bin/fish' },
          { name: 'sh', path: '/bin/sh' },
        ];
        const profiles = shellPaths
          .filter(shell => fs.existsSync(shell.path))
          .map((shell, index) => ({ name: shell.name, path: shell.path, isDefault: index === 0 }));
        this.sendResponse(request.request_id, { profiles });
        break;
      }

      // UI Service
      case 'initializeWebview':
        this.sendResponse(request.request_id, {});
        break;
      case 'subscribeToPartialMessage':
        if (request.is_streaming) {
          this.sendResponse(request.request_id, { ts: Date.now() }, true);
        }
        break;

      // Account Service
      case 'subscribeToAuthStatusUpdate': {
        const user = {
          uid: 'sovereign-hive-user',
          email: 'sovereign@local.hive',
          displayName: 'Sovereign Administrator',
          photoUrl: '',
          provider: 'local',
        };
        this.sendResponse(request.request_id, { user }, true);
        break;
      }

      default:
        this.sendResponse(request.request_id, {});
    }
  }
}
