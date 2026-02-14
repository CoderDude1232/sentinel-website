import { ensureDbSchema, getDbPool } from "@/lib/db";
import { decryptString, encryptString } from "@/lib/encryption";
import type { DiscordTokenBundle } from "@/lib/discord";

export type StoredDiscordOAuthToken = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string;
  expiresAt: string | null;
};

export type DiscordBotIntegrationRecord = {
  enabled: boolean;
  guildId: string | null;
  guildName: string | null;
  alertsChannelId: string | null;
  alertsChannelName: string | null;
  updatedAt: string | null;
};

const DEFAULT_BOT_INTEGRATION: DiscordBotIntegrationRecord = {
  enabled: false,
  guildId: null,
  guildName: null,
  alertsChannelId: null,
  alertsChannelName: null,
  updatedAt: null,
};

export async function upsertDiscordOAuthToken(
  discordUserId: string,
  token: DiscordTokenBundle,
): Promise<void> {
  await ensureDbSchema();
  const pool = getDbPool();
  const encryptedAccessToken = encryptString(token.accessToken);
  const encryptedRefreshToken = token.refreshToken ? encryptString(token.refreshToken) : null;

  await pool.query(
    `
      INSERT INTO user_discord_oauth_tokens (
        discord_user_id,
        encrypted_access_token,
        encrypted_refresh_token,
        token_type,
        scope,
        expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
        token_type = EXCLUDED.token_type,
        scope = EXCLUDED.scope,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `,
    [
      discordUserId,
      encryptedAccessToken,
      encryptedRefreshToken,
      token.tokenType || "Bearer",
      token.scope || "identify guilds",
      token.expiresAt,
    ],
  );
}

export async function getDiscordOAuthToken(
  discordUserId: string,
): Promise<StoredDiscordOAuthToken | null> {
  await ensureDbSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    encrypted_access_token: string;
    encrypted_refresh_token: string | null;
    token_type: string;
    scope: string;
    expires_at: string | null;
  }>(
    `
      SELECT encrypted_access_token, encrypted_refresh_token, token_type, scope, expires_at
      FROM user_discord_oauth_tokens
      WHERE discord_user_id = $1
    `,
    [discordUserId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    accessToken: decryptString(row.encrypted_access_token),
    refreshToken: row.encrypted_refresh_token ? decryptString(row.encrypted_refresh_token) : null,
    tokenType: row.token_type,
    scope: row.scope,
    expiresAt: row.expires_at,
  };
}

export async function clearDiscordOAuthToken(discordUserId: string): Promise<void> {
  await ensureDbSchema();
  const pool = getDbPool();
  await pool.query(
    `
      DELETE FROM user_discord_oauth_tokens
      WHERE discord_user_id = $1
    `,
    [discordUserId],
  );
}

export async function getDiscordBotIntegration(
  discordUserId: string,
): Promise<DiscordBotIntegrationRecord> {
  await ensureDbSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    enabled: boolean;
    guild_id: string | null;
    guild_name: string | null;
    alerts_channel_id: string | null;
    alerts_channel_name: string | null;
    updated_at: string;
  }>(
    `
      SELECT enabled, guild_id, guild_name, alerts_channel_id, alerts_channel_name, updated_at
      FROM discord_bot_integrations
      WHERE discord_user_id = $1
    `,
    [discordUserId],
  );

  const row = result.rows[0];
  if (!row) {
    return DEFAULT_BOT_INTEGRATION;
  }

  return {
    enabled: row.enabled,
    guildId: row.guild_id,
    guildName: row.guild_name,
    alertsChannelId: row.alerts_channel_id,
    alertsChannelName: row.alerts_channel_name,
    updatedAt: row.updated_at,
  };
}

export async function upsertDiscordBotIntegration(
  discordUserId: string,
  input: {
    enabled: boolean;
    guildId: string;
    guildName: string;
    alertsChannelId: string | null;
    alertsChannelName: string | null;
  },
): Promise<DiscordBotIntegrationRecord> {
  await ensureDbSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    enabled: boolean;
    guild_id: string | null;
    guild_name: string | null;
    alerts_channel_id: string | null;
    alerts_channel_name: string | null;
    updated_at: string;
  }>(
    `
      INSERT INTO discord_bot_integrations (
        discord_user_id,
        enabled,
        guild_id,
        guild_name,
        alerts_channel_id,
        alerts_channel_name,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        guild_id = EXCLUDED.guild_id,
        guild_name = EXCLUDED.guild_name,
        alerts_channel_id = EXCLUDED.alerts_channel_id,
        alerts_channel_name = EXCLUDED.alerts_channel_name,
        updated_at = NOW()
      RETURNING enabled, guild_id, guild_name, alerts_channel_id, alerts_channel_name, updated_at
    `,
    [
      discordUserId,
      input.enabled,
      input.guildId,
      input.guildName,
      input.alertsChannelId,
      input.alertsChannelName,
    ],
  );

  const row = result.rows[0];
  return {
    enabled: row.enabled,
    guildId: row.guild_id,
    guildName: row.guild_name,
    alertsChannelId: row.alerts_channel_id,
    alertsChannelName: row.alerts_channel_name,
    updatedAt: row.updated_at,
  };
}

export async function disconnectDiscordBotIntegration(discordUserId: string): Promise<void> {
  await ensureDbSchema();
  const pool = getDbPool();
  await pool.query(
    `
      INSERT INTO discord_bot_integrations (
        discord_user_id,
        enabled,
        guild_id,
        guild_name,
        alerts_channel_id,
        alerts_channel_name,
        created_at,
        updated_at
      )
      VALUES ($1, false, NULL, NULL, NULL, NULL, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        enabled = false,
        guild_id = NULL,
        guild_name = NULL,
        alerts_channel_id = NULL,
        alerts_channel_name = NULL,
        updated_at = NOW()
    `,
    [discordUserId],
  );
}

export async function clearDiscordBotIntegration(discordUserId: string): Promise<void> {
  await ensureDbSchema();
  const pool = getDbPool();
  await pool.query(
    `
      DELETE FROM discord_bot_integrations
      WHERE discord_user_id = $1
    `,
    [discordUserId],
  );
}
