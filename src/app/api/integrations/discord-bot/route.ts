import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  canManageDiscordGuild,
  fetchDiscordBotGuildChannels,
  fetchDiscordGuilds,
  getDiscordBotInviteUrl,
  isDiscordBotConfigured,
  refreshDiscordAccessToken,
} from "@/lib/discord";
import {
  getDiscordBotIntegration,
  getDiscordOAuthToken,
  upsertDiscordBotIntegration,
  upsertDiscordOAuthToken,
  disconnectDiscordBotIntegration,
} from "@/lib/discord-store";
import { ensureWorkspaceSeed } from "@/lib/workspace-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const ms = new Date(expiresAt).getTime();
  return Number.isFinite(ms) && ms <= Date.now() + 30_000;
}

async function resolveGuildAccess(
  userId: string,
): Promise<{
  guilds: Array<{ id: string; name: string; iconUrl: string | null; permissions: string }>;
  requiresRelogin: boolean;
}> {
  const storedToken = await getDiscordOAuthToken(userId);
  if (!storedToken) {
    return { guilds: [], requiresRelogin: true };
  }

  let accessToken = storedToken.accessToken;
  let refreshToken = storedToken.refreshToken;
  let refreshed = false;

  if (isExpired(storedToken.expiresAt) && refreshToken) {
    const refreshedToken = await refreshDiscordAccessToken(refreshToken);
    await upsertDiscordOAuthToken(userId, refreshedToken);
    accessToken = refreshedToken.accessToken;
    refreshToken = refreshedToken.refreshToken;
    refreshed = true;
  }

  try {
    const guilds = await fetchDiscordGuilds(accessToken);
    return {
      guilds: guilds.filter(canManageDiscordGuild),
      requiresRelogin: false,
    };
  } catch {
    if (!refreshToken || refreshed) {
      return { guilds: [], requiresRelogin: true };
    }

    try {
      const refreshedToken = await refreshDiscordAccessToken(refreshToken);
      await upsertDiscordOAuthToken(userId, refreshedToken);
      const guilds = await fetchDiscordGuilds(refreshedToken.accessToken);
      return {
        guilds: guilds.filter(canManageDiscordGuild),
        requiresRelogin: false,
      };
    } catch {
      return { guilds: [], requiresRelogin: true };
    }
  }
}

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const [integration, guildAccess] = await Promise.all([
      getDiscordBotIntegration(user.id),
      resolveGuildAccess(user.id),
    ]);

    const botConfigured = isDiscordBotConfigured();
    const requestedGuildId = request.nextUrl.searchParams.get("guildId")?.trim() || null;
    const selectedGuildId = requestedGuildId || integration.guildId;
    const channels =
      botConfigured && selectedGuildId
        ? await fetchDiscordBotGuildChannels(selectedGuildId).catch(() => [])
        : [];

    return NextResponse.json({
      botConfigured,
      inviteUrl: getDiscordBotInviteUrl(selectedGuildId ?? guildAccess.guilds[0]?.id),
      requiresRelogin: guildAccess.requiresRelogin,
      guilds: guildAccess.guilds,
      channels,
      selectedGuildId,
      integration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Discord bot integration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: { guildId?: string; alertsChannelId?: string | null; enabled?: boolean };
  try {
    body = (await request.json()) as { guildId?: string; alertsChannelId?: string | null; enabled?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const guildId = body.guildId?.trim();
  if (!guildId) {
    return NextResponse.json({ error: "guildId is required" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const guildAccess = await resolveGuildAccess(user.id);
    if (guildAccess.requiresRelogin) {
      return NextResponse.json(
        { error: "Discord guild access expired. Please sign in again." },
        { status: 401 },
      );
    }

    const selectedGuild = guildAccess.guilds.find((guild) => guild.id === guildId);
    if (!selectedGuild) {
      return NextResponse.json(
        { error: "Selected guild is not available. Ensure you can manage the server." },
        { status: 400 },
      );
    }

    const botConfigured = isDiscordBotConfigured();
    const wantsEnabled = body.enabled !== false;
    if (wantsEnabled && !botConfigured) {
      return NextResponse.json(
        { error: "DISCORD_BOT_TOKEN and bot client ID must be configured first." },
        { status: 400 },
      );
    }

    const alertsChannelId = body.alertsChannelId?.trim() || null;
    let alertsChannelName: string | null = null;
    if (alertsChannelId && botConfigured) {
      const channels = await fetchDiscordBotGuildChannels(guildId).catch(() => []);
      const selectedChannel = channels.find((channel) => channel.id === alertsChannelId);
      if (!selectedChannel) {
        return NextResponse.json(
          { error: "Selected channel is not accessible by the bot in that guild." },
          { status: 400 },
        );
      }
      alertsChannelName = selectedChannel.name;
    }

    const integration = await upsertDiscordBotIntegration(user.id, {
      enabled: wantsEnabled,
      guildId: selectedGuild.id,
      guildName: selectedGuild.name,
      alertsChannelId,
      alertsChannelName,
    });

    return NextResponse.json({
      integration,
      inviteUrl: getDiscordBotInviteUrl(selectedGuild.id),
      botConfigured,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Discord bot integration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    await disconnectDiscordBotIntegration(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect Discord bot integration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
