import { Pool } from "pg";

declare global {
  var sentinelPgPool: Pool | undefined;
  var sentinelSchemaReady: boolean | undefined;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return databaseUrl;
}

export function getDbPool(): Pool {
  if (!global.sentinelPgPool) {
    global.sentinelPgPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
  }
  return global.sentinelPgPool;
}

export async function ensureDbSchema(): Promise<void> {
  if (global.sentinelSchemaReady) {
    return;
  }

  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_erlc_keys (
      discord_user_id TEXT PRIMARY KEY,
      encrypted_server_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  global.sentinelSchemaReady = true;
}
