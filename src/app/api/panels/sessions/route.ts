import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { fetchErlcServerSnapshot } from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import {
  createAuditEvent,
  getSessionAutomationSettings,
  upsertSessionAutomationSettings,
} from "@/lib/ops-store";
import { addSession, createAlert, ensureWorkspaceSeed, getSessionsPanel } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

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

function inferServerName(payload: unknown): string | null {
  const record = asObject(payload);
  return (
    asString(record?.Name) ??
    asString(record?.name) ??
    asString(record?.ServerName) ??
    asString(record?.serverName)
  );
}

function inferPlayerCount(serverPayload: unknown): number | null {
  const record = asObject(serverPayload);
  const value = Number(record?.CurrentPlayers ?? record?.currentPlayers);
  return Number.isFinite(value) ? value : null;
}

function inferQueueCount(queuePayload: unknown): number | null {
  if (Array.isArray(queuePayload)) {
    return queuePayload.length;
  }
  const record = asObject(queuePayload);
  if (!record) {
    return null;
  }
  const value = Number(record.count ?? record.Count ?? record.total ?? record.Total);
  if (Number.isFinite(value)) {
    return value;
  }
  const queueArray =
    (Array.isArray(record.queue) ? record.queue : null) ??
    (Array.isArray(record.Queue) ? record.Queue : null) ??
    (Array.isArray(record.data) ? record.data : null) ??
    (Array.isArray(record.Data) ? record.Data : null);
  return queueArray ? queueArray.length : null;
}

function renderAnnouncementTemplate(
  template: string,
  values: { title: string; startsAt: string; playerCount: number | null; queueCount: number | null; serverName: string | null },
): string {
  return template
    .replaceAll("{title}", values.title)
    .replaceAll("{startsAt}", values.startsAt)
    .replaceAll("{playerCount}", values.playerCount === null ? "N/A" : String(values.playerCount))
    .replaceAll("{queueCount}", values.queueCount === null ? "N/A" : String(values.queueCount))
    .replaceAll("{serverName}", values.serverName ?? "Unknown");
}

function inferApiError(payload: unknown): string | null {
  if (typeof payload === "string") {
    const text = payload.trim();
    return text || null;
  }
  const record = asObject(payload);
  return (
    asString(record?.error) ??
    asString(record?.message) ??
    asString(record?.Error) ??
    asString(record?.Message)
  );
}

type CommandPanelResponse = {
  error?: string;
  queuedByCooldown?: boolean;
  cooldownRemaining?: number;
  execution?: {
    result?: "Queued" | "Executed" | "Blocked";
    notes?: string | null;
  };
};

async function dispatchSessionAnnouncement(
  request: NextRequest,
  announcementText: string,
): Promise<{
  attempted: boolean;
  delivered: boolean;
  status: number | null;
  command: string;
  error: string | null;
}> {
  const command = ":announce";
  const commandText = `${command} ${announcementText}`;
  const commandUrl = new URL("/api/panels/commands", request.nextUrl.origin).toString();
  const commandResponse = await fetch(commandUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({
      command,
      notes: announcementText,
      quickAction: true,
    }),
    cache: "no-store",
  });

  const payload = (await commandResponse.json().catch(() => ({}))) as CommandPanelResponse;
  const result = payload.execution?.result ?? "Queued";
  if (commandResponse.ok && result === "Executed") {
    return {
      attempted: true,
      delivered: true,
      status: commandResponse.status,
      command: commandText,
      error: null,
    };
  }

  let error = payload.error ?? inferApiError(payload);
  if (!error) {
    if (result === "Queued" && payload.queuedByCooldown) {
      const cooldown = typeof payload.cooldownRemaining === "number" ? ` (${payload.cooldownRemaining}s remaining)` : "";
      error = `Announcement queued by cooldown${cooldown}.`;
    } else if (result === "Queued") {
      error = "Announcement queued by command policy.";
    } else if (result === "Blocked") {
      error = payload.execution?.notes ?? "Announcement command was blocked.";
    } else {
      error = "Announcement command did not complete successfully.";
    }
  }

  return {
    attempted: true,
    delivered: false,
    status: commandResponse.status,
    command: commandText,
    error,
  };
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const [data, automation, erlcKey] = await Promise.all([
      getSessionsPanel(user.id),
      getSessionAutomationSettings(user.id),
      getUserErlcKey(user.id),
    ]);

    let live = {
      connected: false,
      serverName: null as string | null,
      playerCount: null as number | null,
      queueCount: null as number | null,
      fetchedAt: null as string | null,
    };

    if (erlcKey) {
      const snapshot = await fetchErlcServerSnapshot(erlcKey.serverKey);
      live = {
        connected: snapshot.server.ok,
        serverName: inferServerName(snapshot.server.data),
        playerCount: inferPlayerCount(snapshot.server.data),
        queueCount: inferQueueCount(snapshot.queue.data),
        fetchedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ ...data, automation, live });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { title?: string; startsAt?: string; host?: string; staffingTarget?: number };
  try {
    body = (await request.json()) as { title?: string; startsAt?: string; host?: string; staffingTarget?: number };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.startsAt) {
    return NextResponse.json({ error: "title and startsAt are required" }, { status: 400 });
  }

  const parsedStarts = new Date(body.startsAt);
  if (Number.isNaN(parsedStarts.getTime())) {
    return NextResponse.json({ error: "startsAt must be a valid date" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const [automation, erlcKey] = await Promise.all([
      getSessionAutomationSettings(user.id),
      getUserErlcKey(user.id),
    ]);

    let live = {
      connected: false,
      serverName: null as string | null,
      playerCount: null as number | null,
      queueCount: null as number | null,
    };
    if (erlcKey) {
      const snapshot = await fetchErlcServerSnapshot(erlcKey.serverKey);
      live = {
        connected: snapshot.server.ok,
        serverName: inferServerName(snapshot.server.data),
        playerCount: inferPlayerCount(snapshot.server.data),
        queueCount: inferQueueCount(snapshot.queue.data),
      };
    }

    const record = await addSession({
      userId: user.id,
      title: body.title,
      startsAt: parsedStarts.toISOString(),
      host: body.host?.trim() || user.displayName,
      staffingTarget: Number(body.staffingTarget ?? 10),
    });

    const announcementText = renderAnnouncementTemplate(automation.announcementTemplate, {
      title: record.title,
      startsAt: new Date(record.startsAt).toLocaleString(),
      playerCount: live.playerCount,
      queueCount: live.queueCount,
      serverName: live.serverName,
    });
    const announcement = {
      attempted: false,
      delivered: false,
      status: null as number | null,
      command: "",
      error: null as string | null,
    };

    await createAlert({
      userId: user.id,
      level: "Info",
      source: "Sessions",
      event: automation.announceChannel
        ? `[${automation.announceChannel}] ${announcementText}`
        : announcementText,
    });

    if (erlcKey) {
      const dispatch = await dispatchSessionAnnouncement(request, announcementText);
      announcement.attempted = dispatch.attempted;
      announcement.delivered = dispatch.delivered;
      announcement.status = dispatch.status;
      announcement.command = dispatch.command;
      announcement.error = dispatch.error;
    } else {
      announcement.error = "ER:LC is not connected for this workspace.";
    }

    await createAuditEvent({
      userId: user.id,
      module: "sessions",
      action: "session.created",
      actor: body.host?.trim() || user.displayName,
      subject: record.title,
      afterState: {
        ...record,
        automation: {
          announceChannel: automation.announceChannel,
          pollEnabled: automation.pollEnabled,
          autoEndWhenEmpty: automation.autoEndWhenEmpty,
        },
        announcement,
      },
    });

    return NextResponse.json({ session: record, announcement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    announcementTemplate?: string;
    announceChannel?: string | null;
    pollEnabled?: boolean;
    autoEndWhenEmpty?: boolean;
  };

  try {
    body = (await request.json()) as {
      announcementTemplate?: string;
      announceChannel?: string | null;
      pollEnabled?: boolean;
      autoEndWhenEmpty?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const previous = await getSessionAutomationSettings(user.id);
    const next = await upsertSessionAutomationSettings(user.id, {
      announcementTemplate: body.announcementTemplate ?? previous.announcementTemplate,
      announceChannel: body.announceChannel ?? previous.announceChannel,
      pollEnabled: typeof body.pollEnabled === "boolean" ? body.pollEnabled : previous.pollEnabled,
      autoEndWhenEmpty:
        typeof body.autoEndWhenEmpty === "boolean"
          ? body.autoEndWhenEmpty
          : previous.autoEndWhenEmpty,
    });

    await createAuditEvent({
      userId: user.id,
      module: "sessions",
      action: "automation.updated",
      actor: user.displayName,
      beforeState: previous,
      afterState: next,
    });

    return NextResponse.json({ automation: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
