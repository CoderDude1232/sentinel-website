import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "sentinel_session";
export const DISCORD_OAUTH_STATE_COOKIE_NAME = "sentinel_discord_oauth_state";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type SessionPayload = {
  user: SessionUser;
  iat: number;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64url");
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function createSessionToken(user: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function parseSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadB64);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payloadRaw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadRaw) as SessionPayload;

    if (!payload.user?.id || !payload.user?.username || !payload.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}
