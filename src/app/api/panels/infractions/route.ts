import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { addInfraction, ensureWorkspaceSeed, getInfractions } from "@/lib/workspace-store";

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
    const data = await getInfractions(user.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load infractions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { target?: string; level?: string; issuer?: string; appealStatus?: string };
  try {
    body = (await request.json()) as { target?: string; level?: string; issuer?: string; appealStatus?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.target?.trim() || !body.level?.trim()) {
    return NextResponse.json({ error: "target and level are required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const record = await addInfraction({
      userId: user.id,
      target: body.target,
      level: body.level,
      issuer: body.issuer?.trim() || user.displayName,
      appealStatus: body.appealStatus?.trim() || "Open",
    });
    return NextResponse.json({ case: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create infraction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
