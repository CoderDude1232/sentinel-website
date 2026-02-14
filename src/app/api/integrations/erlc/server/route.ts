import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserErlcKey } from "@/lib/erlc-store";
import { fetchErlcServerSnapshot } from "@/lib/erlc-api";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
  return trimmed ? trimmed : null;
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

function getArray(value: unknown, candidateKeys: string[]): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = getObject(value);
  if (!record) {
    return [];
  }
  for (const key of candidateKeys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }
  return [];
}

function inferListName(entry: unknown): string | null {
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

function inferPermission(entry: unknown): string | null {
  const record = getObject(entry);
  if (!record) {
    return null;
  }
  return pickString(record, [
    "Permission",
    "permission",
    "Role",
    "role",
    "Rank",
    "rank",
  ]);
}

function inferCount(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length;
  }

  const record = getObject(value);
  if (!record) {
    return null;
  }

  const numericCandidates = ["count", "Count", "total", "Total", "CurrentPlayers"];
  for (const key of numericCandidates) {
    const numericValue = getNumber(record[key]);
    if (numericValue !== null) {
      return numericValue;
    }
  }

  const arrayCandidates = ["players", "Players", "queue", "Queue", "data", "Data"];
  for (const key of arrayCandidates) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[]).length;
    }
  }

  return null;
}

function inferServerName(value: unknown): string | null {
  const record = getObject(value);
  if (!record) {
    return null;
  }

  const candidates = ["Name", "name", "ServerName", "serverName"];
  for (const candidate of candidates) {
    const name = record[candidate];
    if (typeof name === "string") {
      return name;
    }
  }
  return null;
}

function inferPermissionBreakdown(playersData: unknown): Array<{ role: string; count: number }> {
  const players = getArray(playersData, ["players", "Players", "data", "Data"]);
  const counts = new Map<string, number>();

  for (const player of players) {
    const role = inferPermission(player);
    if (!role) {
      continue;
    }
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
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

    const snapshot = await fetchErlcServerSnapshot(keyRecord.serverKey);
    const serverRecord = getObject(snapshot.server.data);

    const playerCountFromServer =
      getNumber(serverRecord?.CurrentPlayers) ?? getNumber(serverRecord?.currentPlayers);
    const maxPlayers = getNumber(serverRecord?.MaxPlayers) ?? getNumber(serverRecord?.maxPlayers);

    const playerCount = playerCountFromServer ?? inferCount(snapshot.players.data);
    const queueCount = inferCount(snapshot.queue.data);
    const playersSample = getArray(snapshot.players.data, ["players", "Players", "data", "Data"])
      .map(inferListName)
      .filter((name): name is string => Boolean(name))
      .slice(0, 8);
    const queueSample = getArray(snapshot.queue.data, ["queue", "Queue", "data", "Data"])
      .map(inferListName)
      .filter((name): name is string => Boolean(name))
      .slice(0, 8);

    const serverOwner = pickString(serverRecord, ["Owner", "owner", "ServerOwner", "serverOwner"]);
    const joinCode = pickString(serverRecord, ["JoinCode", "joinCode", "JoinKey", "joinKey", "Code", "code"]);
    const serverRegion = pickString(serverRecord, ["Region", "region", "Location", "location"]);
    const uptime = pickString(serverRecord, ["Uptime", "uptime", "ServerUptime", "serverUptime"]);

    return NextResponse.json({
      connected: snapshot.server.ok,
      serverName: inferServerName(snapshot.server.data),
      playerCount,
      maxPlayers,
      queueCount,
      serverOwner,
      joinCode,
      serverRegion,
      uptime,
      playersSample,
      queueSample,
      permissionBreakdown: inferPermissionBreakdown(snapshot.players.data),
      endpoints: {
        server: { ok: snapshot.server.ok, status: snapshot.server.status, latencyMs: snapshot.server.durationMs },
        players: { ok: snapshot.players.ok, status: snapshot.players.status, latencyMs: snapshot.players.durationMs },
        queue: { ok: snapshot.queue.ok, status: snapshot.queue.status, latencyMs: snapshot.queue.durationMs },
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ER:LC server data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
