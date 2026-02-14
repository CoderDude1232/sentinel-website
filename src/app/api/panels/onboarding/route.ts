import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserErlcKey } from "@/lib/erlc-store";
import {
  ensureWorkspaceSeed,
  getOnboardingPreferences,
  getOnboardingSummary,
  getWorkspaceSettings,
  upsertOnboardingPreferences,
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
    const [preferences, erlcKey, settings] = await Promise.all([
      getOnboardingPreferences(user.id),
      getUserErlcKey(user.id),
      getWorkspaceSettings(user.id),
    ]);
    const enabledModulesCount = Object.values(preferences).filter(Boolean).length;
    const steps = await getOnboardingSummary(user.id, {
      enabledModulesCount,
      erlcConnected: Boolean(erlcKey),
    });
    return NextResponse.json({
      steps,
      preferences,
      settings,
      erlcConnected: Boolean(erlcKey),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load onboarding summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    preferences?: {
      enableModeration?: boolean;
      enableActivity?: boolean;
      enableInfractions?: boolean;
      enableSessions?: boolean;
      enableDepartments?: boolean;
      enableAlerts?: boolean;
    };
    retentionDays?: 30 | 90;
    webhookUrl?: string;
    infractionEvidenceRequired?: boolean;
  };

  try {
    body = (await request.json()) as {
      preferences?: {
        enableModeration?: boolean;
        enableActivity?: boolean;
        enableInfractions?: boolean;
        enableSessions?: boolean;
        enableDepartments?: boolean;
        enableAlerts?: boolean;
      };
      retentionDays?: 30 | 90;
      webhookUrl?: string;
      infractionEvidenceRequired?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const preferences = {
    enableModeration: Boolean(body.preferences?.enableModeration),
    enableActivity: Boolean(body.preferences?.enableActivity),
    enableInfractions: Boolean(body.preferences?.enableInfractions),
    enableSessions: Boolean(body.preferences?.enableSessions),
    enableDepartments: Boolean(body.preferences?.enableDepartments),
    enableAlerts: Boolean(body.preferences?.enableAlerts),
  };

  if (!Object.values(preferences).some(Boolean)) {
    return NextResponse.json({ error: "Enable at least one module to continue onboarding." }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const currentPreferences = await getOnboardingPreferences(user.id);
    const currentSettings = await getWorkspaceSettings(user.id);
    const [savedPreferences, settings] = await Promise.all([
      upsertOnboardingPreferences(user.id, {
        ...currentPreferences,
        ...preferences,
      }),
      upsertWorkspaceSettings(user.id, {
        retentionDays: body.retentionDays === 30 ? 30 : 90,
        webhookUrl:
          body.webhookUrl !== undefined
            ? body.webhookUrl.trim() || null
            : currentSettings.webhookUrl,
        timezone: currentSettings.timezone,
        sessionVisibility: currentSettings.sessionVisibility,
        infractionEvidenceRequired:
          body.infractionEvidenceRequired ?? currentSettings.infractionEvidenceRequired,
      }),
    ]);

    const erlcKey = await getUserErlcKey(user.id);
    const enabledModulesCount = Object.values(savedPreferences).filter(Boolean).length;
    const steps = await getOnboardingSummary(user.id, {
      enabledModulesCount,
      erlcConnected: Boolean(erlcKey),
    });

    return NextResponse.json({
      ok: true,
      preferences: savedPreferences,
      settings,
      erlcConnected: Boolean(erlcKey),
      steps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save onboarding preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
