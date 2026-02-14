import type { SessionUser } from "@/lib/session";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_BOT_PERMISSIONS = "93184";

function requiredEnv(name: "DISCORD_CLIENT_ID" | "DISCORD_CLIENT_SECRET" | "DISCORD_REDIRECT_URI"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function optionalEnv(name: "DISCORD_BOT_TOKEN" | "DISCORD_BOT_CLIENT_ID"): string | null {
  const value = process.env[name];
  return value ? value.trim() : null;
}

type DiscordOAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export type DiscordTokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string;
  expiresAt: string | null;
};

export type DiscordGuild = {
  id: string;
  name: string;
  iconUrl: string | null;
  permissions: string;
};

export type DiscordGuildChannel = {
  id: string;
  name: string;
  type: number;
};

function toTokenBundle(payload: DiscordOAuthTokenResponse): DiscordTokenBundle {
  if (!payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Failed to acquire Discord token");
  }

  const expiresAt =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    tokenType: payload.token_type ?? "Bearer",
    scope: payload.scope ?? "identify guilds",
    expiresAt,
  };
}

function getBotClientId(): string | null {
  return optionalEnv("DISCORD_BOT_CLIENT_ID") ?? process.env.DISCORD_CLIENT_ID ?? null;
}

function requiredBotToken(): string {
  const token = optionalEnv("DISCORD_BOT_TOKEN");
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set");
  }
  return token;
}

export function getDiscordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    redirect_uri: requiredEnv("DISCORD_REDIRECT_URI"),
    response_type: "code",
    scope: "identify guilds",
    state,
    prompt: "consent",
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokenBundle(code: string): Promise<DiscordTokenBundle> {
  const body = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    client_secret: requiredEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: requiredEnv("DISCORD_REDIRECT_URI"),
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as DiscordOAuthTokenResponse;
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Failed to exchange Discord code");
  }

  return toTokenBundle(payload);
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const token = await exchangeCodeForTokenBundle(code);
  return token.accessToken;
}

export async function refreshDiscordAccessToken(refreshToken: string): Promise<DiscordTokenBundle> {
  const body = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    client_secret: requiredEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as DiscordOAuthTokenResponse;
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.error ?? "Failed to refresh Discord token");
  }

  const refreshed = toTokenBundle(payload);
  if (!refreshed.refreshToken) {
    refreshed.refreshToken = refreshToken;
  }
  return refreshed;
}

export async function fetchDiscordUser(accessToken: string): Promise<SessionUser> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Discord user");
  }

  const payload = (await response.json()) as {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };

  const avatarUrl = payload.avatar
    ? `https://cdn.discordapp.com/avatars/${payload.id}/${payload.avatar}.png?size=256`
    : null;

  return {
    id: payload.id,
    username: payload.username,
    displayName: payload.global_name ?? payload.username,
    avatarUrl,
  };
}

export async function fetchDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord guilds (${response.status})`);
  }

  const payload = (await response.json()) as Array<{
    id: string;
    name: string;
    icon: string | null;
    permissions?: string;
    permissions_new?: string;
  }>;

  return payload.map((guild) => ({
    id: guild.id,
    name: guild.name,
    iconUrl: guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
      : null,
    permissions: guild.permissions_new ?? guild.permissions ?? "0",
  }));
}

export function canManageDiscordGuild(guild: Pick<DiscordGuild, "permissions">): boolean {
  try {
    const permissions = BigInt(guild.permissions);
    const MANAGE_GUILD = BigInt(32);
    return (permissions & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export function isDiscordBotConfigured(): boolean {
  return Boolean(optionalEnv("DISCORD_BOT_TOKEN") && getBotClientId());
}

export function getDiscordBotInviteUrl(guildId?: string): string | null {
  const clientId = getBotClientId();
  if (!clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: DISCORD_BOT_PERMISSIONS,
  });

  if (guildId) {
    params.set("guild_id", guildId);
    params.set("disable_guild_select", "false");
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function fetchDiscordBotGuildChannels(guildId: string): Promise<DiscordGuildChannel[]> {
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${requiredBotToken()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guild channels (${response.status})`);
  }

  const payload = (await response.json()) as Array<{
    id: string;
    type: number;
    name?: string;
    position?: number;
  }>;

  return payload
    .filter((channel) => channel.type === 0 || channel.type === 5)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((channel) => ({
      id: channel.id,
      type: channel.type,
      name: channel.name ?? "unknown-channel",
    }));
}

export async function sendDiscordBotMessage(channelId: string, content: string): Promise<boolean> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${requiredBotToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}
