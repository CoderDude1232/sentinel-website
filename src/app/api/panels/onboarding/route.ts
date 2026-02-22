import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getSharedCookieDomain } from "@/lib/cookie-domain";
import { getUserErlcKey } from "@/lib/erlc-store";
import {
  type OnboardingPreferences,
  ensureWorkspaceSeed,
  getOnboardingPreferences,
  getOnboardingSummary,
  getWorkspaceSettings,
  upsertOnboardingPreferences,
  upsertWorkspaceSettings,
} from "@/lib/workspace-store";

const ONBOARDING_COOKIE_NAME = "sentinel_onboarding_complete";
const REQUIRED_ONBOARDING_STEPS = new Set([
  "Create workspace",
  "Choose enabled modules",
  "Configure core settings",
  "Connect ER:LC server",
  "Launch readiness",
]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isOnboardingComplete(
  steps: Array<{ step: string; status: "Complete" | "In progress" | "Pending" }>,
): boolean {
  return steps
    .filter((step) => REQUIRED_ONBOARDING_STEPS.has(step.step))
    .every((step) => step.status === "Complete");
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
    const onboardingComplete = isOnboardingComplete(steps);

    const response = NextResponse.json({
      steps,
      preferences,
      settings,
      erlcConnected: Boolean(erlcKey),
      onboardingComplete,
    });
    const cookieDomain = getSharedCookieDomain();
    response.cookies.set(ONBOARDING_COOKIE_NAME, onboardingComplete ? "1" : "0", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
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

  const preferencesPatch = {
    enableModeration: body.preferences?.enableModeration,
    enableActivity: body.preferences?.enableActivity,
    enableInfractions: body.preferences?.enableInfractions,
    enableSessions: body.preferences?.enableSessions,
    enableDepartments: body.preferences?.enableDepartments,
    enableAlerts: body.preferences?.enableAlerts,
  };

  try {
    await ensureWorkspaceSeed(user);
    const currentPreferences = await getOnboardingPreferences(user.id);
    const mergedPreferences: OnboardingPreferences = {
      enableModeration: preferencesPatch.enableModeration ?? currentPreferences.enableModeration,
      enableActivity: preferencesPatch.enableActivity ?? currentPreferences.enableActivity,
      enableInfractions: preferencesPatch.enableInfractions ?? currentPreferences.enableInfractions,
      enableSessions: preferencesPatch.enableSessions ?? currentPreferences.enableSessions,
      enableDepartments: preferencesPatch.enableDepartments ?? currentPreferences.enableDepartments,
      enableAlerts: preferencesPatch.enableAlerts ?? currentPreferences.enableAlerts,
      enableRbac: currentPreferences.enableRbac,
      enableTeams: currentPreferences.enableTeams,
      enableWorkflows: currentPreferences.enableWorkflows,
      enableAppeals: currentPreferences.enableAppeals,
      enableAutomation: currentPreferences.enableAutomation,
      enableProfiles: currentPreferences.enableProfiles,
      enableLogs: currentPreferences.enableLogs,
      enableRealtime: currentPreferences.enableRealtime,
      enableCommands: currentPreferences.enableCommands,
      enableBackups: currentPreferences.enableBackups,
      enableApiKeys: currentPreferences.enableApiKeys,
      enableObservability: currentPreferences.enableObservability,
      enableBilling: currentPreferences.enableBilling,
    };

    if (!Object.values(mergedPreferences).some(Boolean)) {
      return NextResponse.json({ error: "Enable at least one module to continue onboarding." }, { status: 400 });
    }

    const currentSettings = await getWorkspaceSettings(user.id);
    const [savedPreferences, settings] = await Promise.all([
      upsertOnboardingPreferences(user.id, mergedPreferences),
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
    const onboardingComplete = isOnboardingComplete(steps);

    const response = NextResponse.json({
      ok: true,
      preferences: savedPreferences,
      settings,
      erlcConnected: Boolean(erlcKey),
      onboardingComplete,
      steps,
    });
    const cookieDomain = getSharedCookieDomain();
    response.cookies.set(ONBOARDING_COOKIE_NAME, onboardingComplete ? "1" : "0", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save onboarding preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
