import type { SessionUser } from "@/lib/session";

const DISCORD_API_BASE = "https://discord.com/api";

function requiredEnv(name: "DISCORD_CLIENT_ID" | "DISCORD_CLIENT_SECRET" | "DISCORD_REDIRECT_URI"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getDiscordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    redirect_uri: requiredEnv("DISCORD_REDIRECT_URI"),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code: string): Promise<string> {
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

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Failed to exchange Discord code");
  }

  return payload.access_token;
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
