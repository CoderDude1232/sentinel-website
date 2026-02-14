import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  fetchErlcCommandLogs,
  fetchErlcJoinLogs,
  fetchErlcKillLogs,
  fetchErlcVehicles,
} from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { parseGenericLogItems, parseVehicleItems } from "@/lib/erlc-normalize";
import { ensureWorkspaceSeed, getActivityPanel } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const [data, erlcKey] = await Promise.all([
      getActivityPanel(user.id),
      getUserErlcKey(user.id),
    ]);

    if (!erlcKey) {
      return NextResponse.json({
        ...data,
        prc: {
          connected: false,
          counts: {
            joins: 0,
            kills: 0,
            commands: 0,
            vehicles: 0,
          },
          recent: {
            joins: [],
            kills: [],
            commands: [],
          },
          vehicles: [],
          fetchedAt: null,
        },
      });
    }

    const [joinLogs, killLogs, commandLogs, vehicles] = await Promise.all([
      fetchErlcJoinLogs(erlcKey.serverKey),
      fetchErlcKillLogs(erlcKey.serverKey),
      fetchErlcCommandLogs(erlcKey.serverKey),
      fetchErlcVehicles(erlcKey.serverKey),
    ]);

    const parsedJoinLogs = parseGenericLogItems(joinLogs.data);
    const parsedKillLogs = parseGenericLogItems(killLogs.data);
    const parsedCommandLogs = parseGenericLogItems(commandLogs.data);
    const parsedVehicles = parseVehicleItems(vehicles.data);

    return NextResponse.json({
      ...data,
      prc: {
        connected: true,
        counts: {
          joins: parsedJoinLogs.length,
          kills: parsedKillLogs.length,
          commands: parsedCommandLogs.length,
          vehicles: parsedVehicles.length,
        },
        recent: {
          joins: parsedJoinLogs.slice(0, 12),
          kills: parsedKillLogs.slice(0, 12),
          commands: parsedCommandLogs.slice(0, 12),
        },
        vehicles: parsedVehicles.slice(0, 12),
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity panel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
