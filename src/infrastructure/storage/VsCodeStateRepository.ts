/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type * as vscode from 'vscode';
import { Logger } from '../../shared/services/Logger';
import { Core } from '../database/sovereign/Core';
import { isSecretKey } from '../../shared/storage/state-keys';

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
   * Set a value in global state, secrets, or database
   */
  public async set<T>(key: string, value: T, persistent = true): Promise<void> {
    try {
      if (this._context) {
        if (isSecretKey(key)) {
          // Secret Storage (Encrypted)
          await this._context.secrets.store(key, typeof value === 'string' ? value : JSON.stringify(value));
          Logger.info(`[STORAGE] Key '${key}' stored in encrypted SecretStorage`);
        } else {
          // Global State (Plain Text)
          await this._context.globalState.update(key, value);
        }
      }

      // We only persist non-secrets to BroccoliDB for local mirroring
      if (persistent && !isSecretKey(key) && Core.isAvailable()) {
        await Core.push({
          type: 'upsert',
          table: 'settings',
          where: { column: 'key', value: key },
          values: {
            id: globalThis.crypto.randomUUID(),
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            updatedAt: Date.now(),
          },
        });
      }
    } catch (error) {
      Logger.error(`[STORAGE] Failed to persist key: ${key}`, { error });
      throw error;
    }
  }

  /**
   * Get a value from global state, secrets, or database
   */
  public async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      if (this._context) {
        if (isSecretKey(key)) {
          const secret = await this._context.secrets.get(key);
          if (secret !== undefined) {
            try {
              return JSON.parse(secret) as T;
            } catch {
              return secret as unknown as T;
            }
          }
        } else {
          const val = this._context.globalState.get<T>(key);
          if (val !== undefined) return val;
        }
      }

      // Secondary for persistent configuration
      if (Core.isAvailable()) {
        const results = await Core.selectWhere('settings', { column: 'key', operator: '=', value: key });
        if (results && results.length > 0) {
          const raw = (results[0] as unknown as { value: string }).value;
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
   * Get multiple values from global state, secrets, or database efficiently
   */
  public async getMany(keys: string[]): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    const missingKeys: string[] = [];

    const start = Date.now();
    
    // 1. Parallel retrieval from VS Code Global State & Secrets
    const retrievalPromises = keys.map(async (key) => {
        if (!this._context) return { key, value: undefined };

        if (isSecretKey(key)) {
            try {
                // HARDENING: Protect against OS Keychain hangs with a 2s timeout
                const secret = await Promise.race([
                    this._context.secrets.get(key),
                    new Promise<undefined>((_, reject) => 
                        setTimeout(() => reject(new Error('Keychain timeout')), 2000)
                    )
                ]);
                
                if (secret !== undefined) {
                    try { return { key, value: JSON.parse(secret) }; } catch { return { key, value: secret }; }
                }
            } catch (error) {
                Logger.error(`[STORAGE] Secret retrieval failed for '${key}':`, { error });
            }
        } else {
            const val = this._context.globalState.get(key);
            if (val !== undefined) return { key, value: val };
        }
        return { key, value: undefined };
    });

    const vscResults = await Promise.all(retrievalPromises);
    for (const { key, value } of vscResults) {
        if (value !== undefined) {
            results[key] = value;
        } else {
            missingKeys.push(key);
        }
    }

    if (missingKeys.length > 0 && Core.isAvailable()) {
      // 2. Batch Query from BroccoliDB for missing keys
      try {
        const dbResults = await Core.selectWhere('settings' as unknown as string, { 
            column: 'key', 
            operator: 'IN', 
            value: missingKeys 
        });
        
        for (const row of dbResults as unknown as Array<{ key: string; value: string }>) {
          const raw = row.value;
          try {
            results[row.key] = JSON.parse(raw);
          } catch {
            results[row.key] = raw;
          }
        }
      } catch (error) {
        Logger.error("[STORAGE] Failed to retrieve batch keys", { error });
      }
    }

    const duration = Date.now() - start;
    if (duration > 1000) {
        Logger.warn(`[STORAGE] ⚠️ Slow getMany operation: ${duration}ms for ${keys.length} keys (${missingKeys.length} missing from globalState)`);
    }

    return results;
  }

  /**
   * Delete a key
   */
  public async delete(key: string): Promise<void> {
    if (this._context) {
      if (isSecretKey(key)) {
        await this._context.secrets.delete(key);
      } else {
        await this._context.globalState.update(key, undefined);
      }
    }
    // Note: Core cleanup as needed
  }
}
