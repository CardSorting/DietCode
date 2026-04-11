import * as fs from 'node:fs';
import type * as vscode from 'vscode';
import { StateOrchestrator } from '../../../core/manager/StateOrchestrator';
import { StateSyncService } from '../../../core/manager/StateSyncService';
import { StateAssembler } from '../../../core/manager/StateAssembler';
import type { GrpcRequest, IHandler, SendResponse } from './types';

export class StateAndUiHandler implements IHandler {
  constructor(private context: vscode.ExtensionContext, private sendResponse: SendResponse) {}

  async handle(method: string, request: GrpcRequest): Promise<void> {
    switch (method) {
      // State Service
      case 'getWindowState': {
        const state = await StateAssembler.getInstance().assemble();
        this.sendResponse(request.request_id, { stateJson: JSON.stringify(state) }, request.is_streaming);

        if (request.is_streaming) {
          const unsubscribe = StateSyncService.getInstance().subscribe(
            request.request_id,
            (stateJson) => this.sendResponse(request.request_id, { stateJson }, true)
          );
          this.context.subscriptions.push({ dispose: unsubscribe });
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
