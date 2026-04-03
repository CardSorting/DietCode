import { sql } from 'kysely';

export class Schema {
  /**
   * Internal schema management — handles idempotent table and index creation.
   */
  static async ensureSchema(db: any) {
    await db.schema
      .createTable('knowledge_base')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('knowledge_key', 'text', (col: any) => col.notNull())
      .addColumn('knowledge_value', 'text', (col: any) => col.notNull())
      .addColumn('type', 'text', (col: any) => col.notNull())
      .addColumn('confidence', 'float8', (col: any) => col.notNull())
      .addColumn('tags', 'text', (col: any) => col.notNull())
      .addColumn('metadata', 'text')
      .addColumn('createdAt', 'text', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('healing_proposals')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('violationId', 'text', (col: any) => col.notNull())
      .addColumn('violation', 'text', (col: any) => col.notNull()) // JSON string
      .addColumn('rationale', 'text', (col: any) => col.notNull())
      .addColumn('proposedCode', 'text', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('confidence', 'float8', (col: any) => col.defaultTo(1.0))
      .addColumn('createdAt', 'text', (col: any) => col.notNull())
      .addColumn('appliedAt', 'text')
      .execute();

    await db.schema
      .createTable('snapshots' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('path', 'text', (item: any) => item.notNull())
      .addColumn('content', 'text', (item: any) => item.notNull())
      .addColumn('timestamp', 'int8', (item: any) => item.notNull())
      .addColumn('hash', 'text', (item: any) => item.notNull())
      .addColumn('mtime', 'int8')
      .execute();

    await db.schema
      .createTable('file_context')
      .ifNotExists()
      .addColumn('path', 'text', (col: any) => col.primaryKey())
      .addColumn('state', 'text', (col: any) => col.notNull())
      .addColumn('source', 'text', (col: any) => col.notNull())
      .addColumn('lastReadDate', 'int8')
      .addColumn('lastEditDate', 'int8')
      .addColumn('signature', 'text')
      .addColumn('externalEditDetected', 'boolean', (col: any) => col.defaultTo(false))
      .execute();

    await db.schema
      .createTable('audit_log')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('sessionId', 'text')
      .addColumn('type', 'text', (col: any) => col.notNull())
      .addColumn('message', 'text', (col: any) => col.notNull())
      .addColumn('data', 'text')
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('agent_sessions')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('agentId', 'text', (item: any) => item.notNull())
      .addColumn('status', 'text', (item: any) => item.notNull())
      .addColumn('startTime', 'int8', (item: any) => item.notNull())
      .addColumn('endTime', 'int8')
      .execute();

    await db.schema
      .createTable('joy_imports')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('source_path', 'text', (col: any) => col.notNull())
      .addColumn('imported_path', 'text', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('joy_history')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('score', 'float8', (col: any) => col.notNull())
      .addColumn('violation_count', 'integer', (col: any) => col.notNull())
      .addColumn('file_count', 'integer', (col: any) => col.notNull())
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_joy_imports_source')
      .ifNotExists()
      .on('joy_imports')
      .column('source_path')
      .execute();

    await db.schema
      .createIndex('idx_joy_imports_imported')
      .ifNotExists()
      .on('joy_imports')
      .column('imported_path')
      .execute();

    await db.schema
      .createTable('tasks')
      .ifNotExists()
      .addColumn('task_id', 'text', (col: any) => col.primaryKey())
      .addColumn('title', 'text', (col: any) => col.notNull())
      .addColumn('objective', 'text', (col: any) => col.notNull())
      .addColumn('state', 'text', (col: any) => col.notNull())
      .addColumn('priority', 'integer', (col: any) => col.notNull())
      .addColumn('sim_integrity', 'float8')
      .addColumn('vitals_heartbeat', 'text') // JSON
      .addColumn('v_token', 'text')
      .addColumn('initial_context', 'text')
      .addColumn('created_at', 'int8', (col: any) => col.notNull())
      .addColumn('updated_at', 'int8', (col: any) => col.notNull())
      .addColumn('started_at', 'int8')
      .addColumn('completed_at', 'int8')
      .addColumn('user_agent', 'text', (col: any) => col.notNull())
      .execute();

    // Pass 17: Telemetry & Metabolic Infrastructure
    await db.schema
      .createTable('telemetry' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('repoPath', 'text', (col: any) => col.notNull())
      .addColumn('agentId', 'text', (col: any) => col.notNull())
      .addColumn('taskId', 'text')
      .addColumn('promptTokens', 'integer')
      .addColumn('completionTokens', 'integer')
      .addColumn('totalTokens', 'integer')
      .addColumn('modelId', 'text')
      .addColumn('cost', 'float8')
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .addColumn('environment', 'text')
      .execute();

    await db.schema
      .createTable('metabolic_telemetry' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('taskId', 'text')
      .addColumn('tokensProcessed', 'integer')
      .addColumn('verificationsSuccess', 'integer')
      .addColumn('linesAdded', 'integer')
      .addColumn('linesDeleted', 'integer')
      .addColumn('reads', 'integer')
      .addColumn('writes', 'integer')
      .addColumn('cognitiveHeat', 'float8')
      .addColumn('architecturalDecay', 'float8')
      .addColumn('doubtSignal', 'float8')
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_telemetry_taskId')
      .ifNotExists()
      .on('telemetry' as any)
      .column('taskId')
      .execute();

    await db.schema
      .createIndex('idx_metabolic_taskId')
      .ifNotExists()
      .on('metabolic_telemetry' as any)
      .column('taskId')
      .execute();

    await db.schema
      .createTable('joy_metrics' as any)
      .ifNotExists()
      .addColumn('path', 'text', (col: any) => col.primaryKey())
      .addColumn('violation_count', 'integer', (col: any) => col.notNull())
      .addColumn('hash', 'text', (col: any) => col.notNull())
      .addColumn('last_scanned', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('joy_bypasses')
      .ifNotExists()
      .addColumn('path', 'text', (col: any) => col.primaryKey())
      .addColumn('violation_type', 'text', (col: any) => col.notNull())
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await (db as any).schema
      .createTable('locks' as any)
      .ifNotExists()
      .addColumn('resource', 'text', (col: any) => col.primaryKey())
      .addColumn('owner_id', 'text', (col: any) => col.notNull())
      .addColumn('lock_code', 'text', (col: any) => col.notNull())
      .addColumn('expires_at', 'int8', (col: any) => col.notNull())
      .addColumn('acquired_at', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('integrity_shard_results' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('correlationId', 'text', (col: any) => col.notNull())
      .addColumn('shardId', 'integer', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('result', 'text') // JSON
      .addColumn('error', 'text')
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_integrity_correlation')
      .ifNotExists()
      .on('integrity_shard_results' as any)
      .column('correlationId')
      .execute();

    await db.schema
      .createTable('sovereign_tasks' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('type', 'text', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('total_shards', 'integer', (col: any) => col.notNull())
      .addColumn('completed_shards', 'integer', (col: any) => col.defaultTo(0))
      .addColumn('metadata', 'text') // JSON
      .addColumn('created_at', 'int8', (col: any) => col.notNull())
      .addColumn('updated_at', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('job_results' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('taskId', 'text', (col: any) => col.notNull())
      .addColumn('shardId', 'integer', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('payload', 'text') // JSON result
      .addColumn('error', 'text')
      .addColumn('priority', 'integer', (col: any) => col.defaultTo(0))
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('scoring_cache' as any)
      .ifNotExists()
      .addColumn('hash', 'text', (col: any) => col.primaryKey())
      .addColumn('result', 'text', (col: any) => col.notNull()) // JSON
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_job_results_task')
      .ifNotExists()
      .on('job_results' as any)
      .column('taskId')
      .execute();
  }
}
