import { sql } from 'kysely';

export class Schema {
  /**
   * Internal schema management — handles idempotent table and index creation.
   * Axiomatic Finality: Domain tables are namespaced with 'hive_' to avoid
   * collisions with BroccoliDB system tables.
   */
  static async ensureSchema(db: any) {
    await db.schema
      .createTable('hive_kb')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('knowledge_key', 'text', (col: any) => col.notNull())
      .addColumn('knowledge_value', 'text', (col: any) => col.notNull())
      .addColumn('type', 'text', (col: any) => col.notNull())
      .addColumn('confidence', 'float8', (col: any) => col.notNull())
      .addColumn('tags', 'text', (col: any) => col.notNull())
      .addColumn('metadata', 'text')
      .addColumn('created_at', 'text', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_healing_proposals')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('violation_id', 'text', (col: any) => col.notNull())
      .addColumn('violation', 'text', (col: any) => col.notNull())
      .addColumn('rationale', 'text', (col: any) => col.notNull())
      .addColumn('proposed_code', 'text', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('confidence', 'float8', (col: any) => col.defaultTo(1.0))
      .addColumn('created_at', 'text', (col: any) => col.notNull())
      .addColumn('applied_at', 'text')
      .execute();

    await db.schema
      .createTable('hive_snapshots' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('path', 'text', (item: any) => item.notNull())
      .addColumn('content', 'text', (item: any) => item.notNull())
      .addColumn('timestamp', 'int8', (item: any) => item.notNull())
      .addColumn('hash', 'text', (item: any) => item.notNull())
      .addColumn('mtime', 'int8')
      .execute();

    await db.schema
      .createTable('hive_file_context')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('path', 'text', (col: any) => col.notNull())
      .addColumn('state', 'text', (col: any) => col.notNull())
      .addColumn('source', 'text', (col: any) => col.notNull())
      .addColumn('last_read_date', 'int8')
      .addColumn('last_edit_date', 'int8')
      .addColumn('signature', 'text')
      .addColumn('external_edit_detected', 'boolean', (col: any) => col.defaultTo(false))
      .execute();

    await db.schema
      .createTable('hive_audit')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('session_id', 'text')
      .addColumn('type', 'text', (col: any) => col.notNull())
      .addColumn('message', 'text', (col: any) => col.notNull())
      .addColumn('data', 'text')
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_agent_sessions')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('agent_id', 'text', (item: any) => item.notNull())
      .addColumn('status', 'text', (item: any) => item.notNull())
      .addColumn('start_time', 'int8', (item: any) => item.notNull())
      .addColumn('end_time', 'int8')
      .execute();

    await db.schema
      .createTable('hive_joy_imports')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('source_path', 'text', (col: any) => col.notNull())
      .addColumn('imported_path', 'text', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_joy_history')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('violation_count', 'integer', (col: any) => col.notNull())
      .addColumn('file_count', 'integer', (col: any) => col.notNull())
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_metabolic_telemetry')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('task_id', 'text')
      .addColumn('reads', 'integer', (col: any) => col.notNull())
      .addColumn('writes', 'integer', (col: any) => col.notNull())
      .addColumn('lines_added', 'integer', (col: any) => col.notNull())
      .addColumn('lines_deleted', 'integer', (col: any) => col.notNull())
      .addColumn('tokens_processed', 'integer', (col: any) => col.notNull())
      .addColumn('verifications_success', 'integer', (col: any) => col.notNull())
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_tasks')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('task_id', 'text', (col: any) => col.unique().notNull())
      .addColumn('title', 'text', (col: any) => col.notNull())
      .addColumn('objective', 'text', (col: any) => col.notNull())
      .addColumn('state', 'text', (col: any) => col.notNull())
      .addColumn('priority', 'integer', (col: any) => col.notNull())
      .addColumn('vitals_heartbeat', 'text')
      .addColumn('v_token', 'text')
      .addColumn('initial_context', 'text')
      .addColumn('created_at', 'int8', (col: any) => col.notNull())
      .addColumn('updated_at', 'int8', (col: any) => col.notNull())
      .addColumn('started_at', 'int8')
      .addColumn('completed_at', 'int8')
      .addColumn('user_agent', 'text', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_llm_telemetry')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('repo_path', 'text', (col: any) => col.notNull())
      .addColumn('agent_id', 'text', (col: any) => col.notNull())
      .addColumn('task_id', 'text')
      .addColumn('prompt_tokens', 'integer')
      .addColumn('completion_tokens', 'integer')
      .addColumn('total_tokens', 'integer')
      .addColumn('model_id', 'text')
      .addColumn('cost', 'float8')
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .addColumn('environment', 'text')
      .execute();

    await db.schema
      .createTable('hive_joy_metrics')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('path', 'text', (col: any) => col.notNull())
      .addColumn('violation_count', 'integer', (col: any) => col.notNull())
      .addColumn('hash', 'text', (col: any) => col.notNull())
      .addColumn('last_scanned', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_joy_bypasses')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('path', 'text', (col: any) => col.notNull())
      .addColumn('violation_type', 'text', (col: any) => col.notNull())
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_locks')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('resource', 'text', (col: any) => col.notNull())
      .addColumn('owner_id', 'text', (col: any) => col.notNull())
      .addColumn('lock_code', 'text', (col: any) => col.notNull())
      .addColumn('expires_at', 'int8', (col: any) => col.notNull())
      .addColumn('acquired_at', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_queue')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('type', 'text', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('total_shards', 'integer', (col: any) => col.notNull())
      .addColumn('completed_shards', 'integer', (col: any) => col.defaultTo(0))
      .addColumn('metadata', 'text')
      .addColumn('created_at', 'int8', (col: any) => col.notNull())
      .addColumn('updated_at', 'int8', (col: any) => col.notNull())
      .execute();

    await db.schema
      .createTable('hive_job_results')
      .ifNotExists()
      .addColumn('id', 'text', (col: any) => col.primaryKey())
      .addColumn('task_id', 'text', (col: any) => col.notNull())
      .addColumn('shard_id', 'integer', (col: any) => col.notNull())
      .addColumn('status', 'text', (col: any) => col.notNull())
      .addColumn('payload', 'text')
      .addColumn('error', 'text')
      .addColumn('priority', 'integer', (col: any) => col.defaultTo(0))
      .addColumn('timestamp', 'int8', (col: any) => col.notNull())
      .execute();

    // Axiosmatic Index Finality
    await db.schema.createIndex('idx_hive_telemetry_task').ifNotExists().on('hive_llm_telemetry').column('task_id').execute();
    await db.schema.createIndex('idx_hive_metabolic_task').ifNotExists().on('hive_metabolic_telemetry').column('task_id').execute();
    await db.schema.createIndex('idx_hive_kb_key').ifNotExists().on('hive_kb').column('knowledge_key').execute();
  }
}
