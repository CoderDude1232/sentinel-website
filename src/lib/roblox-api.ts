const ROBLOX_USERNAMES_LOOKUP_API = "https://users.roblox.com/v1/usernames/users";
const ROBLOX_AVATAR_HEADSHOT_API = "https://thumbnails.roblox.com/v1/users/avatar-headshot";
const ROBLOX_USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const USERNAME_BATCH_SIZE = 100;

export type RobloxIdentity = {
  id: number;
  name: string;
  displayName: string;
  avatarUrl: string | null;
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

type RobloxAvatarRecord = {
  targetId?: number;
  imageUrl?: string;
};

type RobloxAvatarPayload = {
  data?: RobloxAvatarRecord[];
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

async function lookupRobloxAvatarBatch(userIds: number[]): Promise<RobloxAvatarPayload> {
  const url = new URL(ROBLOX_AVATAR_HEADSHOT_API);
  url.searchParams.set("userIds", userIds.join(","));
  url.searchParams.set("size", "150x150");
  url.searchParams.set("format", "Png");
  url.searchParams.set("isCircular", "false");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Roblox avatar lookup failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RobloxAvatarPayload;
  return payload;
}

async function getRobloxAvatarUrls(userIds: number[]): Promise<Map<number, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter((id) => Number.isFinite(id) && id > 0)));
  const avatarMap = new Map<number, string>();
  if (!uniqueIds.length) {
    return avatarMap;
  }

  for (let start = 0; start < uniqueIds.length; start += USERNAME_BATCH_SIZE) {
    const chunk = uniqueIds.slice(start, start + USERNAME_BATCH_SIZE);
    try {
      const payload = await lookupRobloxAvatarBatch(chunk);
      const records = Array.isArray(payload.data) ? payload.data : [];
      for (const record of records) {
        if (typeof record.targetId !== "number" || typeof record.imageUrl !== "string") {
          continue;
        }
        const imageUrl = record.imageUrl.trim();
        if (!imageUrl) {
          continue;
        }
        avatarMap.set(record.targetId, imageUrl);
      }
    } catch {
      // Avatar retrieval is optional; username verification should still succeed.
    }
  }

  return avatarMap;
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
  const identitiesById = new Map<number, RobloxIdentity>();
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
      const existing = identitiesById.get(record.id);
      const identity: RobloxIdentity = existing ?? {
        id: record.id,
        name: record.name,
        displayName: record.displayName,
        avatarUrl: null,
      };
      if (!existing) {
        identitiesById.set(record.id, identity);
      }
      found.set(record.name.toLowerCase(), identity);
      if (typeof record.requestedUsername === "string") {
        found.set(record.requestedUsername.toLowerCase(), identity);
      }
    }
  }

  const avatarMap = await getRobloxAvatarUrls(Array.from(identitiesById.keys()));
  for (const identity of identitiesById.values()) {
    identity.avatarUrl = avatarMap.get(identity.id) ?? null;
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
