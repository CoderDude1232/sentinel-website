import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { fetchErlcPlayers, fetchErlcServerSnapshot } from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { verifyRobloxUsernames } from "@/lib/roblox-api";
import {
  createAuditEvent,
  createCommandExecution,
  getCommandPolicy,
  listCommandExecutions,
  upsertCommandPolicy,
} from "@/lib/ops-store";
import { ensureWorkspaceSeed } from "@/lib/workspace-store";

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

function listPlayerNames(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        const record = asObject(entry);
        return (
          asString(record?.Player) ??
          asString(record?.player) ??
          asString(record?.Username) ??
          asString(record?.username) ??
          asString(record?.Name) ??
          asString(record?.name) ??
          ""
        );
      })
      .filter((name): name is string => Boolean(name));
  }

  const record = asObject(payload);
  if (!record) {
    return [];
  }
  const nested =
    (Array.isArray(record.players) ? record.players : null) ??
    (Array.isArray(record.Players) ? record.Players : null) ??
    (Array.isArray(record.data) ? record.data : null) ??
    (Array.isArray(record.Data) ? record.Data : null);
  if (!nested) {
    return [];
  }
  return listPlayerNames(nested);
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

function inferPlayerCount(serverPayload: unknown, playersPayload: unknown): number | null {
  const serverRecord = asObject(serverPayload);
  const serverCount = Number(serverRecord?.CurrentPlayers ?? serverRecord?.currentPlayers);
  if (Number.isFinite(serverCount)) {
    return serverCount;
  }
  return listPlayerNames(playersPayload).length || null;
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

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const [policy, executions, erlcKey] = await Promise.all([
      getCommandPolicy(user.id),
      listCommandExecutions(user.id, 80),
      getUserErlcKey(user.id),
    ]);

    if (!erlcKey) {
      return NextResponse.json({
        policy,
        executions,
        live: { connected: false, serverName: null, playerCount: null, queueCount: null },
        onlinePlayers: [],
      });
    }

    const [snapshot, playersResponse] = await Promise.all([
      fetchErlcServerSnapshot(erlcKey.serverKey),
      fetchErlcPlayers(erlcKey.serverKey),
    ]);

    const rawPlayers = listPlayerNames(playersResponse.data);
    const verifiedMap = await verifyRobloxUsernames(rawPlayers);
    const onlinePlayers = rawPlayers
      .map((name) => verifiedMap.get(name.toLowerCase()))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        id: item.id,
        username: item.name,
        displayName: item.displayName,
      }));

    return NextResponse.json({
      policy,
      executions,
      onlinePlayers,
      live: {
        connected: snapshot.server.ok,
        serverName: inferServerName(snapshot.server.data),
        playerCount: inferPlayerCount(snapshot.server.data, snapshot.players.data),
        queueCount: inferQueueCount(snapshot.queue.data),
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load command panel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { allowlist?: string[]; requiresApproval?: boolean; cooldownSeconds?: number };
  try {
    body = (await request.json()) as { allowlist?: string[]; requiresApproval?: boolean; cooldownSeconds?: number };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const previous = await getCommandPolicy(user.id);
    const next = await upsertCommandPolicy(user.id, {
      allowlist: Array.isArray(body.allowlist) ? body.allowlist : previous.allowlist,
      requiresApproval:
        typeof body.requiresApproval === "boolean"
          ? body.requiresApproval
          : previous.requiresApproval,
      cooldownSeconds:
        typeof body.cooldownSeconds === "number"
          ? body.cooldownSeconds
          : previous.cooldownSeconds,
    });

    await createAuditEvent({
      userId: user.id,
      module: "commands",
      action: "policy.updated",
      actor: user.displayName,
      beforeState: previous,
      afterState: next,
    });

    return NextResponse.json({ policy: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update command policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { command?: string; targetPlayer?: string; notes?: string };
  try {
    body = (await request.json()) as { command?: string; targetPlayer?: string; notes?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const command = body.command?.trim() ?? "";
  const targetPlayer = body.targetPlayer?.trim() ?? "";
  const isGlobalTarget = !targetPlayer;
  const resolvedTarget = isGlobalTarget ? "GLOBAL" : targetPlayer;
  if (!command) {
    return NextResponse.json({ error: "command is required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const [policy, recent] = await Promise.all([
      getCommandPolicy(user.id),
      listCommandExecutions(user.id, 1),
    ]);

    const allowlisted = policy.allowlist.some(
      (entry) => entry.toLowerCase() === command.toLowerCase(),
    );
    if (!allowlisted) {
      const blocked = await createCommandExecution({
        userId: user.id,
        command,
        targetPlayer: resolvedTarget,
        actor: user.displayName,
        result: "Blocked",
        notes: "Blocked by allowlist policy",
      });
      await createAuditEvent({
        userId: user.id,
        module: "commands",
        action: "command.blocked",
        actor: user.displayName,
        subject: resolvedTarget,
        afterState: blocked,
        metadata: { reason: "allowlist", global: isGlobalTarget },
      });
      return NextResponse.json({ error: "Command is not allowlisted.", execution: blocked }, { status: 400 });
    }

    const last = recent[0];
    if (last && policy.cooldownSeconds > 0) {
      const elapsedSeconds = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
      if (elapsedSeconds < policy.cooldownSeconds) {
        const blocked = await createCommandExecution({
          userId: user.id,
          command,
          targetPlayer: resolvedTarget,
          actor: user.displayName,
          result: "Blocked",
          notes: `Cooldown active (${Math.ceil(policy.cooldownSeconds - elapsedSeconds)}s remaining)`,
        });
        await createAuditEvent({
          userId: user.id,
          module: "commands",
          action: "command.blocked",
          actor: user.displayName,
          subject: resolvedTarget,
          afterState: blocked,
          metadata: { reason: "cooldown", global: isGlobalTarget },
        });
        return NextResponse.json({ error: "Command cooldown is active.", execution: blocked }, { status: 400 });
      }
    }

    const erlcKey = await getUserErlcKey(user.id);
    if (!erlcKey) {
      return NextResponse.json({ error: "Connect ER:LC before running commands." }, { status: 400 });
    }

    if (!isGlobalTarget) {
      const playersResponse = await fetchErlcPlayers(erlcKey.serverKey);
      const onlineNames = listPlayerNames(playersResponse.data);
      const verifiedMap = await verifyRobloxUsernames(onlineNames);
      const matchedOnline = onlineNames
        .map((name) => verifiedMap.get(name.toLowerCase())?.name.toLowerCase())
        .filter((name): name is string => Boolean(name))
        .includes(targetPlayer.toLowerCase());

      if (!matchedOnline) {
        const blocked = await createCommandExecution({
          userId: user.id,
          command,
          targetPlayer: resolvedTarget,
          actor: user.displayName,
          result: "Blocked",
          notes: "Target not online in ER:LC snapshot",
        });
        await createAuditEvent({
          userId: user.id,
          module: "commands",
          action: "command.blocked",
          actor: user.displayName,
          subject: resolvedTarget,
          afterState: blocked,
          metadata: { reason: "target_offline", global: false },
        });
        return NextResponse.json({ error: "Target player is not online in ER:LC.", execution: blocked }, { status: 400 });
      }
    }

    const execution = await createCommandExecution({
      userId: user.id,
      command,
      targetPlayer: resolvedTarget,
      actor: user.displayName,
      result: policy.requiresApproval ? "Queued" : "Executed",
      notes: body.notes?.trim() || null,
    });

    await createAuditEvent({
      userId: user.id,
      module: "commands",
      action: policy.requiresApproval ? "command.queued" : "command.executed",
      actor: user.displayName,
      subject: resolvedTarget,
      afterState: execution,
      metadata: { global: isGlobalTarget },
    });

    return NextResponse.json({ execution }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run command";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
