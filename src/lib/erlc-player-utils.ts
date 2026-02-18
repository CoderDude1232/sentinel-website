const ROBLOX_USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function pickString(record: Record<string, unknown> | null, keys: string[]): string | null {
  if (!record) {
    return null;
  }
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function asArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asObject(payload);
  if (!record) {
    return [];
  }
  const nestedKeys = ["players", "Players", "data", "Data"];
  for (const key of nestedKeys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }
  return [];
}

function inferRawPlayerName(entry: unknown): string | null {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed || null;
  }
  const record = asObject(entry);
  if (!record) {
    return null;
  }
  return pickString(record, [
    "Player",
    "player",
    "Username",
    "username",
    "Name",
    "name",
    "Citizen",
    "citizen",
  ]);
}

export function extractRobloxUsernameCandidate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ROBLOX_USERNAME_REGEX.test(trimmed)) {
    return trimmed;
  }

  const colonMatch = trimmed.match(/^([A-Za-z0-9_]{3,20})\s*:\s*\d+$/);
  if (colonMatch) {
    return colonMatch[1];
  }

  const bracketMatch = trimmed.match(/^([A-Za-z0-9_]{3,20})\s*\(\s*\d+\s*\)$/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  const squareBracketMatch = trimmed.match(/^([A-Za-z0-9_]{3,20})\s*\[\s*\d+\s*\]$/);
  if (squareBracketMatch) {
    return squareBracketMatch[1];
  }

  const firstSegment = trimmed.split(/[\|\-,]/)[0]?.trim();
  if (firstSegment && ROBLOX_USERNAME_REGEX.test(firstSegment)) {
    return firstSegment;
  }

  const firstToken = trimmed.split(/\s+/)[0]?.trim();
  if (firstToken && ROBLOX_USERNAME_REGEX.test(firstToken)) {
    return firstToken;
  }

  return null;
}

export function extractErlcPlayerUsernames(payload: unknown): string[] {
  const rawNames = asArray(payload).map(inferRawPlayerName);
  const normalized = rawNames
    .map((name) => extractRobloxUsernameCandidate(name))
    .filter((name): name is string => Boolean(name));
  return Array.from(new Set(normalized));
}
