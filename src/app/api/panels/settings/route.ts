import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import {
  ensureWorkspaceSeed,
  getOnboardingPreferences,
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
    const [settings, modulePreferences] = await Promise.all([
      getWorkspaceSettings(user.id),
      getOnboardingPreferences(user.id),
    ]);
    return NextResponse.json({ ...settings, modulePreferences });
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

    const [savedSettings, savedPreferences] = await Promise.all([settingsUpdate, preferencesUpdate]);
    return NextResponse.json({ ...savedSettings, modulePreferences: savedPreferences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save workspace settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
