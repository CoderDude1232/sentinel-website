import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  fetchErlcBans,
  fetchErlcCommandLogs,
  fetchErlcJoinLogs,
  fetchErlcKillLogs,
  fetchErlcModCalls,
  fetchErlcPlayers,
  fetchErlcServerSnapshot,
  fetchErlcStaff,
  fetchErlcVehicles,
} from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { ensureWorkspaceSeed } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const erlcKey = await getUserErlcKey(user.id);
    if (!erlcKey) {
      return NextResponse.json({
        ok: false,
        connected: false,
        message: "No ER:LC key connected for this workspace.",
      });
    }

    const snapshot = await fetchErlcServerSnapshot(erlcKey.serverKey);
    const endpointChecks = await Promise.all([
      fetchErlcPlayers(erlcKey.serverKey),
      fetchErlcJoinLogs(erlcKey.serverKey),
      fetchErlcKillLogs(erlcKey.serverKey),
      fetchErlcCommandLogs(erlcKey.serverKey),
      fetchErlcModCalls(erlcKey.serverKey),
      fetchErlcBans(erlcKey.serverKey),
      fetchErlcVehicles(erlcKey.serverKey),
      fetchErlcStaff(erlcKey.serverKey),
    ]);

    const endpoints = {
      server: { ok: snapshot.server.ok, status: snapshot.server.status },
      players: { ok: snapshot.players.ok, status: snapshot.players.status },
      queue: { ok: snapshot.queue.ok, status: snapshot.queue.status },
      joinLogs: { ok: endpointChecks[1].ok, status: endpointChecks[1].status },
      killLogs: { ok: endpointChecks[2].ok, status: endpointChecks[2].status },
      commandLogs: { ok: endpointChecks[3].ok, status: endpointChecks[3].status },
      modCalls: { ok: endpointChecks[4].ok, status: endpointChecks[4].status },
      bans: { ok: endpointChecks[5].ok, status: endpointChecks[5].status },
      vehicles: { ok: endpointChecks[6].ok, status: endpointChecks[6].status },
      staff: { ok: endpointChecks[7].ok, status: endpointChecks[7].status },
    };

    const failedCount = Object.values(endpoints).filter((entry) => !entry.ok).length;
    return NextResponse.json({
      ok: failedCount === 0,
      connected: snapshot.server.ok,
      failedCount,
      endpoints,
      syncedAt: new Date().toISOString(),
      message:
        failedCount === 0
          ? "In-game sync complete."
          : `In-game sync complete with ${failedCount} endpoint issue(s).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run in-game refresh";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
