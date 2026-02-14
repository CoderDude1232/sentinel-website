import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  fetchErlcCommandLogs,
  fetchErlcJoinLogs,
  fetchErlcKillLogs,
} from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { parseGenericLogItems } from "@/lib/erlc-normalize";
import { listAuditEvents } from "@/lib/ops-store";
import { ensureWorkspaceSeed } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function toCsvCell(value: string): string {
  const normalized = value.replace(/"/g, "\"\"");
  return `"${normalized}"`;
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  const module = request.nextUrl.searchParams.get("module");
  const action = request.nextUrl.searchParams.get("action");
  const actor = request.nextUrl.searchParams.get("actor");
  const format = request.nextUrl.searchParams.get("format");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "200");

  try {
    await ensureWorkspaceSeed(user);
    const [events, erlcKey] = await Promise.all([
      listAuditEvents({
        userId: user.id,
        module,
        action,
        actor,
        limit: Number.isFinite(limit) ? limit : 200,
      }),
      getUserErlcKey(user.id),
    ]);

    if (format === "csv") {
      const header = [
        "id",
        "createdAt",
        "module",
        "action",
        "actor",
        "subject",
        "beforeState",
        "afterState",
        "metadata",
      ].join(",");
      const rows = events.map((event) =>
        [
          event.id.toString(),
          toCsvCell(event.createdAt),
          toCsvCell(event.module),
          toCsvCell(event.action),
          toCsvCell(event.actor),
          toCsvCell(event.subject ?? ""),
          toCsvCell(JSON.stringify(event.beforeState ?? {})),
          toCsvCell(JSON.stringify(event.afterState ?? {})),
          toCsvCell(JSON.stringify(event.metadata ?? {})),
        ].join(","),
      );

      return new NextResponse([header, ...rows].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"sentinel-audit-${new Date().toISOString().slice(0, 10)}.csv\"`,
        },
      });
    }

    if (!erlcKey) {
      return NextResponse.json({
        events,
        prcLogs: {
          connected: false,
          joinLogs: [],
          killLogs: [],
          commandLogs: [],
          fetchedAt: null,
        },
      });
    }

    const [joinLogsResponse, killLogsResponse, commandLogsResponse] = await Promise.all([
      fetchErlcJoinLogs(erlcKey.serverKey),
      fetchErlcKillLogs(erlcKey.serverKey),
      fetchErlcCommandLogs(erlcKey.serverKey),
    ]);

    return NextResponse.json({
      events,
      prcLogs: {
        connected: true,
        joinLogs: parseGenericLogItems(joinLogsResponse.data).slice(0, 15),
        killLogs: parseGenericLogItems(killLogsResponse.data).slice(0, 15),
        commandLogs: parseGenericLogItems(commandLogsResponse.data).slice(0, 15),
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audit events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
