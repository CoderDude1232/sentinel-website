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

    const missing: string[] = [];
    if (!integration.enabled) {
      missing.push("enable bot delivery");
    }
    if (!integration.guildId) {
      missing.push("select a Discord server");
    }
    if (!integration.alertsChannelId) {
      missing.push("select an alerts channel");
    }

    if (missing.length) {
      return NextResponse.json(
        {
          error: `Discord bot integration is incomplete: ${missing.join(", ")}.`,
          integrationState: {
            enabled: integration.enabled,
            hasGuild: Boolean(integration.guildId),
            hasAlertsChannel: Boolean(integration.alertsChannelId),
          },
        },
        { status: 400 },
      );
    }

    if (!isDiscordBotConfigured()) {
      return NextResponse.json(
        { error: "Discord bot credentials are not configured in environment variables." },
        { status: 400 },
      );
    }

    const alertsChannelId = integration.alertsChannelId;
    if (!alertsChannelId) {
      return NextResponse.json(
        { error: "No alerts channel configured for bot integration." },
        { status: 400 },
      );
    }

    const delivered = await sendDiscordBotMessage(
      alertsChannelId,
      `Sentinel test alert for **${integration.guildName ?? "selected guild"}**.`,
    );

    return NextResponse.json({
      ok: true,
      delivered: delivered.ok,
      status: delivered.status,
      error: delivered.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test bot message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
