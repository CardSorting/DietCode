/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as path from 'node:path';
import { dbPool, setDbPath } from '@noorm/broccoliq';

async function findMissingIdColumn() {
  const dbPath = path.resolve('./data/demo-sovereign.db');
  console.log(`[AUDIT] Inspecting database at: ${dbPath}`);

  setDbPath(dbPath);
  const db = await dbPool.getDb('main');

  // Get all tables
  const tables = await db.introspection.getTables();

  console.log(`[AUDIT] Found ${tables.length} tables. Checking for 'id' column...`);

  for (const table of tables) {
    try {
      const columns = table.columns.map((c) => c.name);
      const hasId = columns.includes('id');

      if (!hasId) {
        console.error(
          `[🚨 FAILURE] Table '${table.name}' IS MISSING the 'id' column! Columns: ${columns.join(', ')}`,
        );
      } else {
        // Now try a raw execution to see if quoting is the issue
        try {
          await (db as any).executeQuery({
            sql: `SELECT id FROM ${table.name} LIMIT 1`,
            parameters: [],
            query: { kind: 'RawNode', sql: { kind: 'RawNode', sqlFragments: [] } } as any,
          });
          // console.log(`[✅] Table '${table.name}' has 'id' and is readable.`);
        } catch (e: any) {
          console.error(
            `[❌ QUOTE ERROR] Table '${table.name}' has 'id' but failed to query: ${e.message}`,
          );
        }
      }
    } catch (e) {
      console.error(`[⚠️] Failed to inspect table '${table.name}':`, e);
    }
  }

  await dbPool.stop();
}

findMissingIdColumn().catch(console.error);
