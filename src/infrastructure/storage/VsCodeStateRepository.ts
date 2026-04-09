/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as vscode from 'vscode';
import { Core } from '../database/sovereign/Core';
import { Logger } from '../../shared/services/Logger';

/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete repository for state persistence.
 * Leverages VS Code's native globalState and Sovereign's BroccoliDB.
 */
export class VsCodeStateRepository {
  private static instance: VsCodeStateRepository;
  private _context?: vscode.ExtensionContext;

  private constructor() {}

  public static getInstance(): VsCodeStateRepository {
    if (!VsCodeStateRepository.instance) {
      VsCodeStateRepository.instance = new VsCodeStateRepository();
    }
    return VsCodeStateRepository.instance;
  }

  public initialize(context: vscode.ExtensionContext) {
    this._context = context;
  }

  /**
   * Set a value in global state or database
   */
  public async set<T>(key: string, value: T, persistent = true): Promise<void> {
    try {
      if (this._context) {
        await this._context.globalState.update(key, value);
      }

      if (persistent && Core.isAvailable()) {
        await Core.push({
          type: 'upsert',
          table: 'settings',
          where: { column: 'key', value: key },
          values: {
            id: globalThis.crypto.randomUUID(),
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedAt: Date.now()
          }
        });
      }
    } catch (error) {
      Logger.error(`[STORAGE] Failed to persist key: ${key}`, { error });
      throw error;
    }
  }

  /**
   * Get a value from global state or database
   */
  public async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      // 1. Try VS Code globalState (Primary for ephemeral/user preferences)
      if (this._context) {
        const val = this._context.globalState.get<T>(key);
        if (val !== undefined) return val;
      }

      // 2. Try BroccoliDB (Secondary for persistent configuration)
      if (Core.isAvailable()) {
        const results = await Core.selectWhere('settings', { key });
        if (results && results.length > 0) {
          const raw = results[0].value;
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as unknown as T;
          }
        }
      }

      return defaultValue;
    } catch (error) {
      Logger.error(`[STORAGE] Failed to retrieve key: ${key}`, { error });
      return defaultValue;
    }
  }

  /**
   * Delete a key
   */
  public async delete(key: string): Promise<void> {
    if (this._context) {
      await this._context.globalState.update(key, undefined);
    }
    
    // Note: Core.deleteWhere or similar would be needed for database cleanup
    // Assuming for now we just null it out or implement Core deletion logic
  }
}
