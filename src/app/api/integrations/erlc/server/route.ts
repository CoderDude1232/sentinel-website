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

    return NextResponse.json({
      connected: snapshot.server.ok,
      serverName: inferServerName(snapshot.server.data),
      playerCount,
      maxPlayers,
      queueCount,
      endpoints: {
        server: { ok: snapshot.server.ok, status: snapshot.server.status },
        players: { ok: snapshot.players.ok, status: snapshot.players.status },
        queue: { ok: snapshot.queue.ok, status: snapshot.queue.status },
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ER:LC server data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
