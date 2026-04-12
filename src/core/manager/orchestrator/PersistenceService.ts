/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { VsCodeStateRepository } from '../../../infrastructure/storage/VsCodeStateRepository';
import type { StateChange } from '../../../domain/state/StateChangeProtocol';
import type { GlobalStateAndSettings } from '../../../shared/storage/state-keys';

/**
 * [LAYER: CORE / ORCHESTRATOR]
 * Handles reading from and writing to the persistent storage layer.
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
    const repo = VsCodeStateRepository.getInstance();
    const val = await repo.get(key);
    if (val !== undefined) {
      this.inMemoryCache.set(key, val);
    }
    return val as T;
  }

  /**
   * Reads a value directly from storage with an optional default.
   */
  async getValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const repo = VsCodeStateRepository.getInstance();
    return await repo.get(key, defaultValue);
  }

  /**
   * Persists a state change to the repository.
   */
  async persistChange<T>(change: StateChange<T>, value: T): Promise<void> {
    const repo = VsCodeStateRepository.getInstance();
    await repo.set(change.key, value);
    this.inMemoryCache.set(change.key, value);
  }

  /**
   * Aggregates a snapshot of all relevant keys.
   */
  async getStateSnapshot(): Promise<GlobalStateAndSettings> {
    const { GlobalStateAndSettingKeys, getDefaultValue } = await import("../../../shared/storage/state-keys");
    const repo = VsCodeStateRepository.getInstance();
    
    // Batch retrieve all known state and setting keys
    const results = await repo.getMany(GlobalStateAndSettingKeys);
    const snapshot: Record<string, unknown> = { ...results };

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
