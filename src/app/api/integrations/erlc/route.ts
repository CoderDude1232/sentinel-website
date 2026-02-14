import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserErlcKey, upsertUserErlcKey, deleteUserErlcKey } from "@/lib/erlc-store";
import { testErlcServerKey } from "@/lib/erlc-api";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function normalizeServerName(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  const candidates = ["Name", "name", "ServerName", "serverName"];
  for (const candidate of candidates) {
    if (typeof record[candidate] === "string") {
      return record[candidate] as string;
    }
  }
  return null;
}

function validationErrorFromStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "Unauthorized key. Use your ER:LC Server-Key from in-game server settings.";
  }
  if (status === 429) {
    return "ER:LC API rate-limited this request. Try again in a few seconds.";
  }
  return "Failed to validate ER:LC key.";
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    const keyRecord = await getUserErlcKey(user.id);
    if (!keyRecord) {
      return NextResponse.json({
        connected: false,
        maskedKey: null,
        updatedAt: null,
      });
    }

    return NextResponse.json({
      connected: true,
      maskedKey: keyRecord.maskedKey,
      updatedAt: keyRecord.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load integration state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let serverKey = "";
  try {
    const body = (await request.json()) as { serverKey?: string };
    serverKey = body.serverKey?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!serverKey || serverKey.length < 12) {
    return NextResponse.json(
      { error: "Please enter a valid ER:LC Server-Key." },
      { status: 400 },
    );
  }

  try {
    const testResult = await testErlcServerKey(serverKey);
    if (!testResult.ok) {
      return NextResponse.json(
        {
          error: validationErrorFromStatus(testResult.status),
          details: testResult.data,
          status: testResult.status,
        },
        { status: 400 },
      );
    }

    const maskedKey = await upsertUserErlcKey(user.id, serverKey);
    return NextResponse.json({
      connected: true,
      maskedKey,
      serverName: normalizeServerName(testResult.data),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save ER:LC key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await deleteUserErlcKey(user.id);
    return NextResponse.json({ connected: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete ER:LC key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
