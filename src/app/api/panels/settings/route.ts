import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  ensureWorkspaceSeed,
  getWorkspaceSettings,
  upsertWorkspaceSettings,
} from "@/lib/workspace-store";

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
    const settings = await getWorkspaceSettings(user.id);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workspace settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    retentionDays?: 30 | 90;
    webhookUrl?: string | null;
    timezone?: string;
    sessionVisibility?: string;
    infractionEvidenceRequired?: boolean;
  };

  try {
    body = (await request.json()) as {
      retentionDays?: 30 | 90;
      webhookUrl?: string | null;
      timezone?: string;
      sessionVisibility?: string;
      infractionEvidenceRequired?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const saved = await upsertWorkspaceSettings(user.id, {
      retentionDays: body.retentionDays === 30 ? 30 : 90,
      webhookUrl: body.webhookUrl?.trim() ? body.webhookUrl.trim() : null,
      timezone: body.timezone?.trim() || "UTC",
      sessionVisibility: body.sessionVisibility?.trim() || "Team",
      infractionEvidenceRequired: Boolean(body.infractionEvidenceRequired),
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save workspace settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
