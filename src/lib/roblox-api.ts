const ROBLOX_USERNAMES_LOOKUP_API = "https://users.roblox.com/v1/usernames/users";
const ROBLOX_USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const USERNAME_BATCH_SIZE = 100;

export type RobloxIdentity = {
  id: number;
  name: string;
  displayName: string;
};

function normalizeUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return null;
  }
  if (!ROBLOX_USERNAME_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

type RobloxLookupRecord = {
  requestedUsername?: string;
  id?: number;
  name?: string;
  displayName?: string;
};

type RobloxLookupPayload = {
  data?: RobloxLookupRecord[];
};

async function lookupRobloxUsernamesBatch(usernames: string[]): Promise<RobloxLookupPayload> {
  const response = await fetch(ROBLOX_USERNAMES_LOOKUP_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      usernames,
      excludeBannedUsers: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Roblox username lookup failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RobloxLookupPayload;
  return payload;
}

export async function verifyRobloxUsernames(usernames: string[]): Promise<Map<string, RobloxIdentity>> {
  const normalizedUnique = Array.from(
    new Set(
      usernames
        .map((username) => normalizeUsername(username))
        .filter((username): username is string => Boolean(username)),
    ),
  );

  const found = new Map<string, RobloxIdentity>();
  if (!normalizedUnique.length) {
    return found;
  }

  for (let start = 0; start < normalizedUnique.length; start += USERNAME_BATCH_SIZE) {
    const chunk = normalizedUnique.slice(start, start + USERNAME_BATCH_SIZE);
    const payload = await lookupRobloxUsernamesBatch(chunk);
    const records = Array.isArray(payload.data) ? payload.data : [];
    for (const record of records) {
      if (typeof record.id !== "number" || typeof record.name !== "string" || typeof record.displayName !== "string") {
        continue;
      }
      const identity: RobloxIdentity = {
        id: record.id,
        name: record.name,
        displayName: record.displayName,
      };
      found.set(record.name.toLowerCase(), identity);
      if (typeof record.requestedUsername === "string") {
        found.set(record.requestedUsername.toLowerCase(), identity);
      }
    }
  }

  return found;
}

export async function verifyRobloxUsername(username: string): Promise<RobloxIdentity | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }
  const verified = await verifyRobloxUsernames([normalized]);
  return verified.get(normalized.toLowerCase()) ?? null;
}

