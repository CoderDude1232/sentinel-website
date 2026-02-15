import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserErlcKey } from "@/lib/erlc-store";
import { fetchErlcPlayers } from "@/lib/erlc-api";
import { verifyRobloxUsernames } from "@/lib/roblox-api";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
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
    const value = getString(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function getArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = getObject(value);
  if (!record) {
    return [];
  }
  const keys = ["players", "Players", "data", "Data"];
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }
  return [];
}

function inferPlayerName(entry: unknown): string | null {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed || null;
  }
  const record = getObject(entry);
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

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    const keyRecord = await getUserErlcKey(user.id);
    if (!keyRecord) {
      return NextResponse.json({ error: "No ER:LC key configured" }, { status: 404 });
    }

    const playersResponse = await fetchErlcPlayers(keyRecord.serverKey);
    if (!playersResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch online players from ER:LC",
          status: playersResponse.status,
          details: playersResponse.data,
        },
        { status: 502 },
      );
    }

    const rawPlayerNames = Array.from(
      new Set(
        getArray(playersResponse.data)
          .map(inferPlayerName)
          .filter((name): name is string => Boolean(name)),
      ),
    );

    const verifiedMap = await verifyRobloxUsernames(rawPlayerNames);
    const onlinePlayers = rawPlayerNames
      .map((name) => verifiedMap.get(name.toLowerCase()))
      .filter((identity): identity is NonNullable<typeof identity> => Boolean(identity))
      .map((identity) => ({
        id: identity.id,
        username: identity.name,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));

    return NextResponse.json({
      onlinePlayers,
      verifiedCount: onlinePlayers.length,
      rawCount: rawPlayerNames.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load online players";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
