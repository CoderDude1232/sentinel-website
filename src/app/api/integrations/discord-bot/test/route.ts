import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { isDiscordBotConfigured, sendDiscordBotMessage } from "@/lib/discord";
import { getDiscordBotIntegration } from "@/lib/discord-store";
import { ensureWorkspaceSeed } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const integration = await getDiscordBotIntegration(user.id);

    if (!integration.enabled || !integration.guildId || !integration.alertsChannelId) {
      return NextResponse.json(
        { error: "Discord bot integration is not fully configured." },
        { status: 400 },
      );
    }

    if (!isDiscordBotConfigured()) {
      return NextResponse.json(
        { error: "Discord bot credentials are not configured in environment variables." },
        { status: 400 },
      );
    }

    const delivered = await sendDiscordBotMessage(
      integration.alertsChannelId,
      `Sentinel test alert for **${integration.guildName ?? "selected guild"}**.`,
    );

    return NextResponse.json({ ok: true, delivered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test bot message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

