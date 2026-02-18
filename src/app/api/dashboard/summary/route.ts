import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  fetchErlcCommandLogs,
  fetchErlcModCalls,
  fetchErlcServerSnapshot,
} from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { ensureWorkspaceSeed, getDashboardSummary } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function inferServerName(value: unknown): string | null {
  const record = asObject(value);
  if (!record) {
    return null;
  }
  const candidates = ["Name", "name", "ServerName", "serverName"];
  for (const key of candidates) {
    const next = record[key];
    if (typeof next === "string" && next.trim()) {
      return next.trim();
    }
  }
  return null;
}

function inferCount(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length;
  }
  const record = asObject(value);
  if (!record) {
    return null;
  }
  const numericCandidates = ["count", "Count", "total", "Total", "CurrentPlayers", "currentPlayers"];
  for (const key of numericCandidates) {
    const next = Number(record[key]);
    if (Number.isFinite(next)) {
      return next;
    }
  }
  const arrayCandidates = ["players", "Players", "queue", "Queue", "data", "Data", "logs", "Logs", "items", "Items"];
  for (const key of arrayCandidates) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[]).length;
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
    await ensureWorkspaceSeed(user);
    const [summary, erlcKey] = await Promise.all([
      getDashboardSummary(user.id),
      getUserErlcKey(user.id),
    ]);

    if (!erlcKey) {
      return NextResponse.json({
        ...summary,
        erlc: {
          keyConfigured: false,
          connected: false,
          serverName: null,
          playerCount: null,
          queueCount: null,
          modCallCount: null,
          commandLogCount: null,
          endpoints: null,
          fetchedAt: null,
        },
      });
    }

    const [snapshot, modCalls, commandLogs] = await Promise.all([
      fetchErlcServerSnapshot(erlcKey.serverKey),
      fetchErlcModCalls(erlcKey.serverKey),
      fetchErlcCommandLogs(erlcKey.serverKey),
    ]);

    return NextResponse.json({
      ...summary,
      erlc: {
        keyConfigured: true,
        connected: snapshot.server.ok,
        serverName: inferServerName(snapshot.server.data),
        playerCount: inferCount(snapshot.players.data),
        queueCount: inferCount(snapshot.queue.data),
        modCallCount: inferCount(modCalls.data),
        commandLogCount: inferCount(commandLogs.data),
        endpoints: {
          server: { ok: snapshot.server.ok, status: snapshot.server.status, latencyMs: snapshot.server.durationMs },
          players: { ok: snapshot.players.ok, status: snapshot.players.status, latencyMs: snapshot.players.durationMs },
          queue: { ok: snapshot.queue.ok, status: snapshot.queue.status, latencyMs: snapshot.queue.durationMs },
          modCalls: { ok: modCalls.ok, status: modCalls.status, latencyMs: modCalls.durationMs },
          commandLogs: { ok: commandLogs.ok, status: commandLogs.status, latencyMs: commandLogs.durationMs },
        },
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
