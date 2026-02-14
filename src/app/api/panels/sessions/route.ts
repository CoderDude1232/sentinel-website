import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { addSession, ensureWorkspaceSeed, getSessionsPanel } from "@/lib/workspace-store";

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
    const data = await getSessionsPanel(user.id);
    return NextResponse.json(data);
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
    const record = await addSession({
      userId: user.id,
      title: body.title,
      startsAt: parsedStarts.toISOString(),
      host: body.host?.trim() || user.displayName,
      staffingTarget: Number(body.staffingTarget ?? 10),
    });
    return NextResponse.json({ session: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
