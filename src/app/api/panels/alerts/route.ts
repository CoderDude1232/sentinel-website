import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getDiscordBotIntegration } from "@/lib/discord-store";
import { isDiscordBotConfigured, sendDiscordBotMessage } from "@/lib/discord";
import {
  createAlert,
  ensureWorkspaceSeed,
  getAlerts,
  getWorkspaceSettings,
} from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function sendDiscordWebhook(url: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const data = await getAlerts(user.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { level?: string; event?: string; source?: string; sendWebhook?: boolean };
  try {
    body = (await request.json()) as { level?: string; event?: string; source?: string; sendWebhook?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.event?.trim()) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);

    const level = body.level?.trim() || "Info";
    const source = body.source?.trim() || "Alerts";
    const event = body.event.trim();

    await createAlert({
      userId: user.id,
      level,
      source,
      event,
    });

    const settings = await getWorkspaceSettings(user.id);
    const botIntegration = await getDiscordBotIntegration(user.id);
    let webhookDelivered = false;
    let botDelivered = false;
    const botConfigured =
      isDiscordBotConfigured() &&
      botIntegration.enabled &&
      Boolean(botIntegration.guildId) &&
      Boolean(botIntegration.alertsChannelId);

    if (body.sendWebhook && settings.webhookUrl) {
      webhookDelivered = await sendDiscordWebhook(
        settings.webhookUrl,
        `**Sentinel Alert**\nLevel: ${level}\nSource: ${source}\nEvent: ${event}`,
      );
    }

    if (body.sendWebhook && botConfigured && botIntegration.alertsChannelId) {
      botDelivered = await sendDiscordBotMessage(
        botIntegration.alertsChannelId,
        `Sentinel Alert\nLevel: ${level}\nSource: ${source}\nEvent: ${event}`,
      );
    }

    return NextResponse.json({
      ok: true,
      webhookDelivered,
      botDelivered,
      webhookConfigured: Boolean(settings.webhookUrl),
      botConfigured,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
