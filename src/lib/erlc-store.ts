import { ensureDbSchema, getDbPool } from "@/lib/db";
import { decryptString, encryptString } from "@/lib/encryption";

type StoredKeyRecord = {
  serverKey: string;
  maskedKey: string;
  updatedAt: string;
};

function maskKey(key: string): string {
  if (key.length <= 8) {
    return "*".repeat(Math.max(0, key.length - 2)) + key.slice(-2);
  }
  return `${key.slice(0, 4)}${"*".repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`;
}

export async function getUserErlcKey(discordUserId: string): Promise<StoredKeyRecord | null> {
  await ensureDbSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    encrypted_server_key: string;
    updated_at: string;
  }>(
    `
      SELECT encrypted_server_key, updated_at
      FROM user_erlc_keys
      WHERE discord_user_id = $1
    `,
    [discordUserId],
  );

  if (!result.rows[0]) {
    return null;
  }

  const decryptedKey = decryptString(result.rows[0].encrypted_server_key);
  return {
    serverKey: decryptedKey,
    maskedKey: maskKey(decryptedKey),
    updatedAt: result.rows[0].updated_at,
  };
}

export async function upsertUserErlcKey(discordUserId: string, serverKey: string): Promise<string> {
  await ensureDbSchema();
  const pool = getDbPool();
  const encryptedServerKey = encryptString(serverKey);

  await pool.query(
    `
      INSERT INTO user_erlc_keys (discord_user_id, encrypted_server_key, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET encrypted_server_key = EXCLUDED.encrypted_server_key, updated_at = NOW()
    `,
    [discordUserId, encryptedServerKey],
  );

  return maskKey(serverKey);
}

export async function deleteUserErlcKey(discordUserId: string): Promise<void> {
  await ensureDbSchema();
  const pool = getDbPool();
  await pool.query(
    `
      DELETE FROM user_erlc_keys
      WHERE discord_user_id = $1
    `,
    [discordUserId],
  );
}
