/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Core } from '../../../infrastructure/database/sovereign/Core';
import type { StateChange } from '../../../domain/state/StateChangeProtocol';
import type { GlobalStateAndSettings } from '../../../shared/storage/state-keys';

/**
 * [LAYER: CORE / ORCHESTRATOR]
 * Handles reading from and writing to the persistent storage layer.
 * Optimized for Sovereign CLI using BroccoliQ database persistence.
 */
export class PersistenceService {
  private inMemoryCache = new Map<string, unknown>();

  /**
   * Reads a value from memory or storage.
   */
  async getState<T>(key: string): Promise<T | undefined> {
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as T;
    }
    
    const db = await Core.db();
    const row = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', key)
      .executeTakeFirst();
      
    if (row) {
      const val = JSON.parse(row.value);
      this.inMemoryCache.set(key, val);
      return val as T;
    }
    return undefined;
  }

  /**
   * Reads a value directly from storage with an optional default.
   */
  async getValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const val = await this.getState<T>(key);
    return val !== undefined ? val : defaultValue;
  }

  /**
   * Persists a state change to the repository.
   */
  async persistChange<T>(change: StateChange<T>, value: T): Promise<void> {
    const db = await Core.db();
    const valueStr = JSON.stringify(value);
    
    await db
      .insertInto('settings')
      .values({
        id: change.key, // Use key as ID for simple settings
        key: change.key,
        value: valueStr,
        updatedAt: Date.now(),
      })
      .onConflict((oc) => 
        oc.column('key').doUpdateSet({
          value: valueStr,
          updatedAt: Date.now(),
        })
      )
      .execute();

    this.inMemoryCache.set(change.key, value);
  }

  /**
   * Aggregates a snapshot of all relevant keys.
   */
  async getStateSnapshot(): Promise<GlobalStateAndSettings> {
    const { GlobalStateAndSettingKeys, getDefaultValue } = await import("../../../shared/storage/state-keys");
    const db = await Core.db();
    
    const rows = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', 'in', GlobalStateAndSettingKeys as string[])
      .execute();
      
    const snapshot: Record<string, unknown> = {};
    for (const row of rows) {
      snapshot[row.key] = JSON.parse(row.value);
    }

    // Fill in defaults for any missing keys
    for (const key of GlobalStateAndSettingKeys) {
      if (snapshot[key] === undefined) {
        const val = getDefaultValue(key);
        if (val !== undefined) {
          snapshot[key] = val;
        }
      }
    }

    return snapshot as GlobalStateAndSettings;
  }
}
