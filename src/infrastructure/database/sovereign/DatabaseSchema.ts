import type { Kysely } from 'kysely';

/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: database]
 * Principle: TypeScript type definitions for Kysely database schema
 */

export interface DatabaseSchema {
  users: {
    id: string;
    name: string;
    email: string;
    password: string | null;
    provider: string | null;
    providerId: string | null;
    avatarUrl: string | null;
    createdAt: number;
    updatedAt: number;
  };

  repositories: {
    id: string;
    workspaceId: string;
    repoId: string;
    repoPath: string;
    forkedFrom: string | null;
    forkedFromRemote: string | null;
    defaultBranch: string;
    createdAt: number;
  };

  files: {
    id: string;
    path: string;
    content: string;
    encoding: string;
    size: number;
    updatedAt: number;
    author: string;
  };

  nodes: {
    id: string;
    repoPath: string;
    parentId: string | null;
    data: string | null;
    message: string | null;
    timestamp: number;
    author: string | null;
    type: string | null;
    tree: string | null;
    usage: string | null;
    metadata: string | null;
  };

  // Hive tables
  hive_file_context: {
    id: string;
    path: string;
    state: string;
    source: string;
    lastReadDate: number | null;
    lastEditDate: number | null;
    signature: string | null;
    externalEditDetected: number;
  };
}

// Export the Kysely database type
export type KyselyDatabase = Kysely<DatabaseSchema>;
