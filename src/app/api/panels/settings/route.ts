import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserErlcKey } from "@/lib/erlc-store";
import { createAuditEvent } from "@/lib/ops-store";
import {
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

export async function GET(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  try {
    await ensureWorkspaceSeed(user);
    const [settings, modulePreferences, erlcKey] = await Promise.all([
      getWorkspaceSettings(user.id),
      getOnboardingPreferences(user.id),
      getUserErlcKey(user.id),
    ]);
    const enabledModulesCount = Object.values(modulePreferences).filter(Boolean).length;
    const steps = await getOnboardingSummary(user.id, {
      enabledModulesCount,
      erlcConnected: Boolean(erlcKey),
    });
    const onboardingComplete = steps
      .filter((step) => REQUIRED_ONBOARDING_STEPS.has(step.step))
      .every((step) => step.status === "Complete");
    const response = NextResponse.json({ ...settings, modulePreferences, onboardingComplete });
    response.cookies.set(ONBOARDING_COOKIE_NAME, onboardingComplete ? "1" : "0", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workspace settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  let body: {
    retentionDays?: 30 | 90;
    webhookUrl?: string | null;
    timezone?: string;
    sessionVisibility?: string;
    infractionEvidenceRequired?: boolean;
    modulePreferences?: {
      enableModeration?: boolean;
      enableActivity?: boolean;
      enableInfractions?: boolean;
      enableSessions?: boolean;
      enableDepartments?: boolean;
      enableAlerts?: boolean;
      enableRbac?: boolean;
      enableTeams?: boolean;
      enableWorkflows?: boolean;
      enableAppeals?: boolean;
      enableAutomation?: boolean;
      enableProfiles?: boolean;
      enableLogs?: boolean;
      enableRealtime?: boolean;
      enableCommands?: boolean;
      enableBackups?: boolean;
      enableApiKeys?: boolean;
      enableObservability?: boolean;
      enableBilling?: boolean;
    };
  };

  try {
    body = (await request.json()) as {
      retentionDays?: 30 | 90;
      webhookUrl?: string | null;
      timezone?: string;
      sessionVisibility?: string;
      infractionEvidenceRequired?: boolean;
      modulePreferences?: {
        enableModeration?: boolean;
        enableActivity?: boolean;
        enableInfractions?: boolean;
        enableSessions?: boolean;
        enableDepartments?: boolean;
        enableAlerts?: boolean;
        enableRbac?: boolean;
        enableTeams?: boolean;
        enableWorkflows?: boolean;
        enableAppeals?: boolean;
        enableAutomation?: boolean;
        enableProfiles?: boolean;
        enableLogs?: boolean;
        enableRealtime?: boolean;
        enableCommands?: boolean;
        enableBackups?: boolean;
        enableApiKeys?: boolean;
        enableObservability?: boolean;
        enableBilling?: boolean;
      };
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureWorkspaceSeed(user);
    const existingPreferences = await getOnboardingPreferences(user.id);
    const settingsUpdate = upsertWorkspaceSettings(user.id, {
      retentionDays: body.retentionDays === 30 ? 30 : 90,
      webhookUrl: body.webhookUrl?.trim() ? body.webhookUrl.trim() : null,
      timezone: body.timezone?.trim() || "UTC",
      sessionVisibility: body.sessionVisibility?.trim() || "Team",
      infractionEvidenceRequired: Boolean(body.infractionEvidenceRequired),
    });

    const preferencesUpdate = upsertOnboardingPreferences(user.id, {
      enableModeration: body.modulePreferences?.enableModeration ?? existingPreferences.enableModeration,
      enableActivity: body.modulePreferences?.enableActivity ?? existingPreferences.enableActivity,
      enableInfractions: body.modulePreferences?.enableInfractions ?? existingPreferences.enableInfractions,
      enableSessions: body.modulePreferences?.enableSessions ?? existingPreferences.enableSessions,
      enableDepartments: body.modulePreferences?.enableDepartments ?? existingPreferences.enableDepartments,
      enableAlerts: body.modulePreferences?.enableAlerts ?? existingPreferences.enableAlerts,
      enableRbac: body.modulePreferences?.enableRbac ?? existingPreferences.enableRbac,
      enableTeams: body.modulePreferences?.enableTeams ?? existingPreferences.enableTeams,
      enableWorkflows: body.modulePreferences?.enableWorkflows ?? existingPreferences.enableWorkflows,
      enableAppeals: body.modulePreferences?.enableAppeals ?? existingPreferences.enableAppeals,
      enableAutomation: body.modulePreferences?.enableAutomation ?? existingPreferences.enableAutomation,
      enableProfiles: body.modulePreferences?.enableProfiles ?? existingPreferences.enableProfiles,
      enableLogs: body.modulePreferences?.enableLogs ?? existingPreferences.enableLogs,
      enableRealtime: body.modulePreferences?.enableRealtime ?? existingPreferences.enableRealtime,
      enableCommands: body.modulePreferences?.enableCommands ?? existingPreferences.enableCommands,
      enableBackups: body.modulePreferences?.enableBackups ?? existingPreferences.enableBackups,
      enableApiKeys: body.modulePreferences?.enableApiKeys ?? existingPreferences.enableApiKeys,
      enableObservability: body.modulePreferences?.enableObservability ?? existingPreferences.enableObservability,
      enableBilling: body.modulePreferences?.enableBilling ?? existingPreferences.enableBilling,
    });

    const [savedSettings, savedPreferences, erlcKey] = await Promise.all([
      settingsUpdate,
      preferencesUpdate,
      getUserErlcKey(user.id),
    ]);
    const enabledModulesCount = Object.values(savedPreferences).filter(Boolean).length;
    const steps = await getOnboardingSummary(user.id, {
      enabledModulesCount,
      erlcConnected: Boolean(erlcKey),
    });
    const onboardingComplete = steps
      .filter((step) => REQUIRED_ONBOARDING_STEPS.has(step.step))
      .every((step) => step.status === "Complete");

    const response = NextResponse.json({
      ...savedSettings,
      modulePreferences: savedPreferences,
      onboardingComplete,
    });

    await createAuditEvent({
      userId: user.id,
      module: "settings",
      action: "workspace.updated",
      actor: user.displayName,
      afterState: {
        retentionDays: savedSettings.retentionDays,
        timezone: savedSettings.timezone,
        sessionVisibility: savedSettings.sessionVisibility,
        webhookConfigured: Boolean(savedSettings.webhookUrl),
      },
      metadata: {
        enabledModules: Object.values(savedPreferences).filter(Boolean).length,
      },
    });

    response.cookies.set(ONBOARDING_COOKIE_NAME, onboardingComplete ? "1" : "0", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save workspace settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
