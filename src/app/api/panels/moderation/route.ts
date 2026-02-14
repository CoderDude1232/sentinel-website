import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { fetchErlcModCalls } from "@/lib/erlc-api";
import { getUserErlcKey } from "@/lib/erlc-store";
import { parseGenericLogItems } from "@/lib/erlc-normalize";
import {
  addModerationCase,
  ensureWorkspaceSeed,
  getModerationCases,
  updateModerationCase,
} from "@/lib/workspace-store";
import { verifyRobloxUsername } from "@/lib/roblox-api";
import { createAuditEvent } from "@/lib/ops-store";

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
    const [cases, erlcKey] = await Promise.all([
      getModerationCases(user.id),
      getUserErlcKey(user.id),
    ]);

    if (!erlcKey) {
      return NextResponse.json({
        cases,
        prc: {
          connected: false,
          modCalls: [],
          openModCalls: 0,
          fetchedAt: null,
        },
      });
    }

    const modCallsResponse = await fetchErlcModCalls(erlcKey.serverKey);
    const modCalls = parseGenericLogItems(modCallsResponse.data);
    return NextResponse.json({
      cases,
      prc: {
        connected: true,
        modCalls: modCalls.slice(0, 20),
        openModCalls: modCalls.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load moderation cases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { type?: string; player?: string; owner?: string; status?: string; playerSource?: "online" | "offline" };
  try {
    body = (await request.json()) as { type?: string; player?: string; owner?: string; status?: string; playerSource?: "online" | "offline" };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.type?.trim() || !body.player?.trim()) {
    return NextResponse.json({ error: "Type and player are required" }, { status: 400 });
  }

  try {
    const verifiedPlayer = await verifyRobloxUsername(body.player);
    if (!verifiedPlayer) {
      return NextResponse.json(
        {
          error:
            body.playerSource === "online"
              ? "Selected online player could not be verified as a valid Roblox username."
              : "Offline player username is not a valid Roblox username.",
        },
        { status: 400 },
      );
    }

    await ensureWorkspaceSeed(user);
    const record = await addModerationCase({
      userId: user.id,
      type: body.type,
      player: verifiedPlayer.name,
      owner: body.owner?.trim() || user.displayName,
      status: body.status?.trim() || "Queued",
    });

    await createAuditEvent({
      userId: user.id,
      module: "moderation",
      action: "case.created",
      actor: body.owner?.trim() || user.displayName,
      subject: verifiedPlayer.name,
      afterState: record,
    });

    return NextResponse.json({ case: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create moderation case";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { id?: number; status?: string; owner?: string };
  try {
    body = (await request.json()) as { id?: number; status?: string; owner?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id || !body.status?.trim()) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const record = await updateModerationCase({
      userId: user.id,
      id: body.id,
      status: body.status,
      owner: body.owner?.trim() || user.displayName,
    });

    if (!record) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    await createAuditEvent({
      userId: user.id,
      module: "moderation",
      action: "case.updated",
      actor: body.owner?.trim() || user.displayName,
      subject: record.player,
      afterState: {
        id: record.id,
        caseRef: record.caseRef,
        status: record.status,
        owner: record.owner,
      },
    });

    return NextResponse.json({ case: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update moderation case";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
