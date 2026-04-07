/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: File system monitoring with event notification
 * Prework Status: Not applicable (new file)
 *
 * Monitors file system changes and aggregates events for efficient notification.
 * Supports recursive and non-recursive watching with change filtering.
 */

import { type FSWatcher as ChokidarWatcher, watch } from 'chokidar';
import { FileChangeType } from '../../domain/context/FileChange';
import type { FileChange } from '../../domain/context/FileChange';

/**
 * File watcher configuration
 */
export interface FileWatcherConfig {
  /**
   * Path(s) to watch
   */
  paths: string | string[];

  /**
   * Whether to watch recursively
   */
  recursive?: boolean;

  /**
   * Whether to follow symlinks
   */
  followSymlinks?: boolean;

  /**
   * Ignore patterns (regex, glob patterns)
   */
  ignore?: string[];

  /**
   * Interval in ms between filter checks
   */
  aggregateInterval?: number;

  /**
   * Debounce delay for events in ms
   */
  debounceDelay?: number;

  /**
   * Whether to emit add events (created files)
   */
  emitAdd?: boolean;

  /**
   * Whether to emit unlink events (deleted files)
   */
  emitUnlink?: boolean;

  /**
   * Whether to emit change events (modified files)
   */
  emitChange?: boolean;
}

/**
 * File watch change type
 * Re-exported from domain
 */
export { FileChangeType };

/**
 * FileWatcherEvent interface
 */
export interface FileWatcherEvent {
  /**
   * Type of change
   */
  type: FileChangeType;

  /**
   * Path of the changed file
   */
  path: string;

  /**
   * Previous path (if renamed)
   */
  oldPath?: string;

  /**
   * Timestamp of change
   */
  timestamp: number;

  /**
   * Is file/directory existing after change?
   */
  exists: boolean;
}

/**
 * FileWatcher result interface
 */
export interface FileWatcherResult {
  /**
   * Events aggregated during interval
   */
  events: FileWatcherEvent[];

  /**
   * Total events count
   */
  totalCount: number;

  /**
   * Duration of observation in ms
   */
  duration: number;

  /**
   * Unique paths affected
   */
  uniquePaths: Set<string>;
}

/**
 * FileWatcherAdapter
 *
 * Monitors file system changes and aggregates events for efficient notification.
 * Uses Chokidar for efficient file watching with diffing and change aggregation.
 *
 * Key responsibilities:
 * - Watch file system for changes
 * - Aggregate events with debouncing
 * - Filter events by type and path
 * - Emit file change notifications
 */
export class FileWatcherAdapter {
  protected watchers: Map<string, ChokidarWatcher> = new Map();
  private eventQueue: FileWatcherEvent[] = [];
  private aggregateTimeout: NodeJS.Timeout | null = null;
  private onFileChangeListeners: Set<(event: FileWatcherEvent) => Promise<void>> = new Set();

  protected config: Required<FileWatcherConfig>;
  private watcherOptions: any;
  private recentlyEditedByAgent: Set<string> = new Set();

  constructor(config: FileWatcherConfig) {
    this.config = {
      paths: config.paths,
      recursive: config.recursive ?? false,
      followSymlinks: config.followSymlinks ?? false,
      ignore: config.ignore ?? [],
      aggregateInterval: config.aggregateInterval ?? 100,
      debounceDelay: config.debounceDelay ?? 50,
      emitAdd: config.emitAdd ?? true,
      emitUnlink: config.emitUnlink ?? true,
      emitChange: config.emitChange ?? true,
    };

    this.watcherOptions = {
      ignoreInitial: true, // Don't emit events for initial scan
      cwd: process.cwd(),
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    };
  }

  /**
   * Start watching
   */
  async watch(): Promise<void> {
    const paths = Array.isArray(this.config.paths) ? this.config.paths : [this.config.paths];

    console.log(`👀 File watcher started: ${paths.join(', ')}`);

    for (const path of paths) {
      // Normalize path to absolute
      const absolutePath = path.startsWith('/')
        ? path
        : require('node:path').join(process.cwd(), path);

      const watcher = watch(absolutePath, this.watcherOptions);
      this.watchers.set(absolutePath, watcher);

      // Configure event handlers
      watcher
        .on('add', (path: string) => this.handleAdd(path))
        .on('change', (path: string) => this.handleChange(path))
        .on('unlink', (path: string) => this.handleUnlink(path))
        .on('addDir', (path: string) => this.handleAddDir(path))
        .on('unlinkDir', (path: string) => this.handleUnlinkDir(path))
        .on('ready', () => {
          console.log(`✅ Watcher ready for: ${absolutePath}`);
          this.emitReady();
        })
        .on('error', (error: any) => {
          console.error(`❌ Watcher error on ${absolutePath}:`, error);
          this.emitError(error);
        });
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      console.log(`🛑 Watcher stopped: ${path}`);
    }
    this.watchers.clear();
    this.flush();
  }

  /**
   * Handle file addition
   */
  private handleAdd(path: string): void {
    if (!this.config.emitAdd) return;
    this.enqueueEvent({
      type: FileChangeType.ADDED,
      path,
      timestamp: Date.now(),
      exists: true,
    });
  }

  /**
   * Handle file modification
   */
  private handleChange(path: string): void {
    if (!this.config.emitChange) return;

    // Cline Pattern: Ignore events for files we just edited
    if (this.recentlyEditedByAgent.has(path)) {
      this.recentlyEditedByAgent.delete(path);
      return;
    }

    this.enqueueEvent({
      type: FileChangeType.MODIFIED,
      path,
      timestamp: Date.now(),
      exists: true,
    });
  }

  /**
   * Mark a file as recently edited by the agent to ignore the next watcher event.
   */
  public markAsEditedByAgent(path: string): void {
    this.recentlyEditedByAgent.add(path);
    // Cleanup after 1 second if no event received (safety net)
    setTimeout(() => {
      this.recentlyEditedByAgent.delete(path);
    }, 1000);
  }

  /**
   * Handle file deletion
   */
  private handleUnlink(path: string): void {
    if (!this.config.emitUnlink) return;
    this.enqueueEvent({
      type: FileChangeType.DELETED,
      path,
      timestamp: Date.now(),
      exists: false,
    });
  }

  /**
   * Handle directory addition
   */
  private handleAddDir(path: string): void {
    if (!this.config.emitAdd) return;
    this.enqueueEvent({
      type: FileChangeType.ADD_DIR,
      path,
      timestamp: Date.now(),
      exists: true,
    });
  }

  /**
   * Handle directory deletion
   */
  private handleUnlinkDir(path: string): void {
    if (!this.config.emitUnlink) return;
    this.enqueueEvent({
      type: FileChangeType.UNLINK_DIR,
      path,
      timestamp: Date.now(),
      exists: false,
    });
  }

  /**
   * Enqueue event for aggregation
   */
  private enqueueEvent(event: FileWatcherEvent): void {
    // Debounce: clear previous timeout and restart
    if (this.aggregateTimeout) {
      clearTimeout(this.aggregateTimeout);
    }

    this.eventQueue.push(event);

    this.aggregateTimeout = setTimeout(() => {
      this.flush();
    }, this.config.aggregateInterval);
  }

  /**
   * Flush all queued events to listeners
   */
  protected flush(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const listener of this.onFileChangeListeners) {
      for (const event of events) {
        listener(event).catch((error) => {
          console.error('❌ File watcher listener error:', error);
        });
      }
    }
  }

  /**
   * Register file change listener
   */
  onFileChange(listener: (event: FileWatcherEvent) => Promise<void>): void {
    this.onFileChangeListeners.add(listener);
    console.log(`✅ File change listener registered (total: ${this.onFileChangeListeners.size})`);
  }

  /**
   * Unregister file change listener
   */
  offFileChange(listener: (event: FileWatcherEvent) => Promise<void>): void {
    this.onFileChangeListeners.delete(listener);
    console.log(`🗑️  File change listener unregistered (total: ${this.onFileChangeListeners.size})`);
  }

  /**
   * Emit ready event
   */
  private emitReady(): void {
    // Notify listeners (implementation depends on your notification system)
    console.log(`📦 File watcher ready (listeners: ${this.onFileChangeListeners.size})`);
  }

  /**
   * Emit error event
   */
  private emitError(error: Error): void {
    // Notify listeners (implementation depends on your notification system)
    console.error('💥 File watcher error:', error);
  }

  /**
   * Reset the watcher state
   */
  reset(): void {
    this.flush();
    this.eventQueue = [];
    console.log('🔄 File watcher reset');
  }

  /**
   * Get watcher error (if any)
   */
  getError(): Error | null {
    return null; // Chokidar stores errors differently, would need to track
  }

  /**
   * Get active watch paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Check if path is being watched
   */
  isWatching(path: string): boolean {
    const absolutePath = path.startsWith('/')
      ? path
      : require('node:path').join(process.cwd(), path);

    return this.watchers.has(absolutePath);
  }

  /**
   * Bind to a specific event type
   */
  filterEvents(eventFilter: (event: FileWatcherEvent) => Promise<void>): void {
    this.onFileChange(eventFilter);
  }
}

/**
 * Round-robin file watcher for rotating paths
 */
export class RoundRobinFileWatcher extends FileWatcherAdapter {
  private watchedPaths: string[] = [];
  private currentIndex = 0;

  constructor(count: number, config: FileWatcherConfig) {
    super(config);
    this.watchedPaths = Array(count).fill(''); // Will be updated by watch()
  }

  private subWatchers: Map<string, FileWatcherAdapter> = new Map();

  override async watch(): Promise<void> {
    const rootPaths = Array.isArray(this.config.paths) ? this.config.paths : [this.config.paths];
    for (let i = 0; i < rootPaths.length; i++) {
      const path = rootPaths[i];
      const rootPathConfig: FileWatcherConfig = {
        ...this.config,
        paths: path as string,
      };

      console.log(`👀 Round-robin: Watching ${path} (stream ${i + 1}/${rootPaths.length})`);

      // Watch this path as root
      const watcher = new FileWatcherAdapter(rootPathConfig);
      await watcher.watch();

      this.subWatchers.set(`round_robin_${i}`, watcher);
    }
  }

  override async stop(): Promise<void> {
    for (const watcher of this.subWatchers.values()) {
      await watcher.stop();
    }
    this.subWatchers.clear();
    this.flush();
  }
}

/**
 * File watcher mode enum
 */
export enum FileWatcherMode {
  EVENTS = 'events', // Emit events on change
  AGGREGATED = 'aggregated', // Emit aggregated events only
  POLLING = 'polling', // Poll for changes periodically
}

/**
 * Common file watcher configurations
 */
export const FileWatcherDefaults: FileWatcherConfig = {
  paths: process.cwd(),
  recursive: true,
  followSymlinks: false,
  ignore: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/*.log',
    '**/coverage/**',
  ],
  aggregateInterval: 100,
  debounceDelay: 50,
  emitAdd: true,
  emitUnlink: true,
  emitChange: true,
};
