import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserErlcKey } from "@/lib/erlc-store";
import { fetchErlcPlayers } from "@/lib/erlc-api";
import { verifyRobloxUsernames } from "@/lib/roblox-api";
import { extractErlcPlayerUsernames } from "@/lib/erlc-player-utils";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function safeVerifyRobloxUsernames(usernames: string[]) {
  try {
    return await verifyRobloxUsernames(usernames);
  } catch {
    return new Map();
  }
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    const keyRecord = await getUserErlcKey(user.id);
    if (!keyRecord) {
      return NextResponse.json({ error: "No ER:LC key configured" }, { status: 404 });
    }

    const playersResponse = await fetchErlcPlayers(keyRecord.serverKey);
    if (!playersResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch online players from ER:LC",
          status: playersResponse.status,
          details: playersResponse.data,
        },
        { status: 502 },
      );
    }

    const rawPlayerNames = extractErlcPlayerUsernames(playersResponse.data);
    const verifiedMap = await safeVerifyRobloxUsernames(rawPlayerNames);
    const onlinePlayers = rawPlayerNames
      .map((name) => verifiedMap.get(name.toLowerCase()))
      .filter((identity): identity is NonNullable<typeof identity> => Boolean(identity))
      .map((identity) => ({
        id: identity.id,
        username: identity.name,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));

    return NextResponse.json({
      onlinePlayers,
      verifiedCount: onlinePlayers.length,
      rawCount: rawPlayerNames.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load online players";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
