import { ensureDbSchema, getDbPool } from "@/lib/db";
import type { SessionUser } from "@/lib/session";
import { getDiscordBotIntegration } from "@/lib/discord-store";

declare global {
  var sentinelWorkspaceSchemaReady: boolean | undefined;
}

export type ModerationCase = {
  id: number;
  caseRef: string;
  type: string;
  player: string;
  status: string;
  owner: string;
  createdAt: string;
};

export type InfractionCase = {
  id: number;
  caseRef: string;
  target: string;
  level: string;
  issuer: string;
  appealStatus: string;
  createdAt: string;
};

export type SessionRecord = {
  id: number;
  title: string;
  startsAt: string;
  host: string;
  staffingCurrent: number;
  staffingTarget: number;
  status: string;
  rating: number | null;
  createdAt: string;
};

export type DepartmentRecord = {
  id: number;
  name: string;
  lead: string;
  members: number;
  scope: string;
  createdAt: string;
};

export type AlertRecord = {
  id: number;
  level: string;
  event: string;
  source: string;
  createdAt: string;
};

export type ActivityKpis = {
  staffActions24h: number;
  averageResponseSeconds: number | null;
  attendanceCompliancePct: number | null;
  activeStaffNow: number;
};

export type ActivityLeaderboardRow = {
  name: string;
  sessions: number;
  actions: number;
  score: string;
};

export type WorkspaceSettings = {
  retentionDays: 30 | 90;
  webhookUrl: string | null;
  timezone: string;
  sessionVisibility: string;
  infractionEvidenceRequired: boolean;
};

export type OnboardingPreferences = {
  enableModeration: boolean;
  enableActivity: boolean;
  enableInfractions: boolean;
  enableSessions: boolean;
  enableDepartments: boolean;
  enableAlerts: boolean;
  enableRbac: boolean;
  enableTeams: boolean;
  enableWorkflows: boolean;
  enableAppeals: boolean;
  enableAutomation: boolean;
  enableProfiles: boolean;
  enableLogs: boolean;
  enableRealtime: boolean;
  enableCommands: boolean;
  enableBackups: boolean;
  enableApiKeys: boolean;
  enableObservability: boolean;
  enableBilling: boolean;
};

export type FeatureEntry = {
  id: number;
  feature: string;
  title: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  cards: Array<{ title: string; value: string; details: string }>;
  feed: Array<{ time: string; label: string; level: string }>;
  nextActions: Array<{ label: string; href: string }>;
};

const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  retentionDays: 90,
  webhookUrl: null,
  timezone: "UTC",
  sessionVisibility: "Team",
  infractionEvidenceRequired: true,
};

const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  enableModeration: false,
  enableActivity: false,
  enableInfractions: false,
  enableSessions: false,
  enableDepartments: false,
  enableAlerts: false,
  enableRbac: false,
  enableTeams: false,
  enableWorkflows: false,
  enableAppeals: false,
  enableAutomation: false,
  enableProfiles: false,
  enableLogs: false,
  enableRealtime: false,
  enableCommands: false,
  enableBackups: false,
  enableApiKeys: false,
  enableObservability: false,
  enableBilling: false,
};

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

function formatRelativeTime(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return "just now";
  }
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

function getScoreFromActions(actions: number): string {
  if (actions >= 30) return "A";
  if (actions >= 24) return "A-";
  if (actions >= 18) return "B+";
  if (actions >= 12) return "B";
  return "C";
}

function createCaseRef(prefix: string): string {
  const random = Math.floor(1000 + Math.random() * 8999);
  return `${prefix}-${random}`;
}

export async function ensureWorkspaceSchema(): Promise<void> {
  if (global.sentinelWorkspaceSchemaReady) {
    return;
  }

  await ensureDbSchema();
  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_bootstrap (
      discord_user_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_settings (
      discord_user_id TEXT PRIMARY KEY,
      retention_days INTEGER NOT NULL DEFAULT 90,
      webhook_url TEXT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      session_visibility TEXT NOT NULL DEFAULT 'Team',
      infraction_evidence_required BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_preferences (
      discord_user_id TEXT PRIMARY KEY,
      enable_moderation BOOLEAN NOT NULL DEFAULT true,
      enable_activity BOOLEAN NOT NULL DEFAULT true,
      enable_infractions BOOLEAN NOT NULL DEFAULT true,
      enable_sessions BOOLEAN NOT NULL DEFAULT true,
      enable_departments BOOLEAN NOT NULL DEFAULT true,
      enable_alerts BOOLEAN NOT NULL DEFAULT true,
      enable_rbac BOOLEAN NOT NULL DEFAULT true,
      enable_teams BOOLEAN NOT NULL DEFAULT true,
      enable_workflows BOOLEAN NOT NULL DEFAULT true,
      enable_appeals BOOLEAN NOT NULL DEFAULT true,
      enable_automation BOOLEAN NOT NULL DEFAULT true,
      enable_profiles BOOLEAN NOT NULL DEFAULT true,
      enable_logs BOOLEAN NOT NULL DEFAULT true,
      enable_realtime BOOLEAN NOT NULL DEFAULT true,
      enable_commands BOOLEAN NOT NULL DEFAULT true,
      enable_backups BOOLEAN NOT NULL DEFAULT true,
      enable_api_keys BOOLEAN NOT NULL DEFAULT true,
      enable_observability BOOLEAN NOT NULL DEFAULT true,
      enable_billing BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_rbac BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_teams BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_workflows BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_appeals BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_automation BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_profiles BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_logs BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_realtime BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_commands BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_backups BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_api_keys BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_observability BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE onboarding_preferences ADD COLUMN IF NOT EXISTS enable_billing BOOLEAN NOT NULL DEFAULT false;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_feature_entries (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      feature_key TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_cases (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      case_ref TEXT NOT NULL,
      case_type TEXT NOT NULL,
      player_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Queued',
      owner_name TEXT NOT NULL DEFAULT 'Unassigned',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS infractions (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      case_ref TEXT NOT NULL,
      target_name TEXT NOT NULL,
      level TEXT NOT NULL,
      issuer_name TEXT NOT NULL,
      appeal_status TEXT NOT NULL DEFAULT 'Open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      host_name TEXT NOT NULL,
      staffing_current INTEGER NOT NULL DEFAULT 0,
      staffing_target INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      rating NUMERIC(3, 2) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      members INTEGER NOT NULL DEFAULT 0,
      scope TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      level TEXT NOT NULL,
      event_text TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_events (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      context_text TEXT NOT NULL,
      response_seconds INTEGER NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_moderation_cases_user_created ON moderation_cases (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_infractions_user_created ON infractions (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_departments_user_created ON departments (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_events (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_feature_entries_user_feature ON workspace_feature_entries (discord_user_id, feature_key, created_at DESC);`);

  global.sentinelWorkspaceSchemaReady = true;
}

export async function ensureWorkspaceSeed(_user: SessionUser): Promise<void> {
  await ensureWorkspaceSchema();
}

export async function resetWorkspaceData(userId: string): Promise<void> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM workspace_feature_entries WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM moderation_cases WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM infractions WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM sessions WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM departments WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM alerts WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM activity_events WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM onboarding_preferences WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM workspace_settings WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM workspace_bootstrap WHERE discord_user_id = $1`, [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createActivityEvent(input: {
  userId: string;
  actor: string;
  eventType: string;
  context: string;
  responseSeconds?: number | null;
}): Promise<void> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  await pool.query(
    `
      INSERT INTO activity_events (
        discord_user_id,
        actor_name,
        event_type,
        context_text,
        response_seconds,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [input.userId, input.actor, input.eventType, input.context, input.responseSeconds ?? null],
  );
}

export async function createAlert(input: {
  userId: string;
  level: string;
  event: string;
  source: string;
}): Promise<void> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  await pool.query(
    `
      INSERT INTO alerts (discord_user_id, level, event_text, source, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `,
    [input.userId, input.level, input.event, input.source],
  );
}

export async function getWorkspaceSettings(userId: string): Promise<WorkspaceSettings> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    retention_days: number;
    webhook_url: string | null;
    timezone: string;
    session_visibility: string;
    infraction_evidence_required: boolean;
  }>(
    `
      SELECT retention_days, webhook_url, timezone, session_visibility, infraction_evidence_required
      FROM workspace_settings
      WHERE discord_user_id = $1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return { ...DEFAULT_WORKSPACE_SETTINGS };
  }

  return {
    retentionDays: row.retention_days === 30 ? 30 : 90,
    webhookUrl: row.webhook_url,
    timezone: row.timezone,
    sessionVisibility: row.session_visibility,
    infractionEvidenceRequired: row.infraction_evidence_required,
  };
}

export async function upsertWorkspaceSettings(
  userId: string,
  settings: WorkspaceSettings,
): Promise<WorkspaceSettings> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    retention_days: number;
    webhook_url: string | null;
    timezone: string;
    session_visibility: string;
    infraction_evidence_required: boolean;
  }>(
    `
      INSERT INTO workspace_settings (
        discord_user_id,
        retention_days,
        webhook_url,
        timezone,
        session_visibility,
        infraction_evidence_required,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        retention_days = EXCLUDED.retention_days,
        webhook_url = EXCLUDED.webhook_url,
        timezone = EXCLUDED.timezone,
        session_visibility = EXCLUDED.session_visibility,
        infraction_evidence_required = EXCLUDED.infraction_evidence_required,
        updated_at = NOW()
      RETURNING retention_days, webhook_url, timezone, session_visibility, infraction_evidence_required
    `,
    [
      userId,
      settings.retentionDays,
      settings.webhookUrl,
      settings.timezone.trim() || "UTC",
      settings.sessionVisibility.trim() || "Team",
      settings.infractionEvidenceRequired,
    ],
  );

  const row = result.rows[0];
  return {
    retentionDays: row.retention_days === 30 ? 30 : 90,
    webhookUrl: row.webhook_url,
    timezone: row.timezone,
    sessionVisibility: row.session_visibility,
    infractionEvidenceRequired: row.infraction_evidence_required,
  };
}

export async function getOnboardingPreferences(userId: string): Promise<OnboardingPreferences> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    enable_moderation: boolean;
    enable_activity: boolean;
    enable_infractions: boolean;
    enable_sessions: boolean;
    enable_departments: boolean;
    enable_alerts: boolean;
    enable_rbac: boolean;
    enable_teams: boolean;
    enable_workflows: boolean;
    enable_appeals: boolean;
    enable_automation: boolean;
    enable_profiles: boolean;
    enable_logs: boolean;
    enable_realtime: boolean;
    enable_commands: boolean;
    enable_backups: boolean;
    enable_api_keys: boolean;
    enable_observability: boolean;
    enable_billing: boolean;
  }>(
    `
      SELECT
        enable_moderation,
        enable_activity,
        enable_infractions,
        enable_sessions,
        enable_departments,
        enable_alerts,
        enable_rbac,
        enable_teams,
        enable_workflows,
        enable_appeals,
        enable_automation,
        enable_profiles,
        enable_logs,
        enable_realtime,
        enable_commands,
        enable_backups,
        enable_api_keys,
        enable_observability,
        enable_billing
      FROM onboarding_preferences
      WHERE discord_user_id = $1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return { ...DEFAULT_ONBOARDING_PREFERENCES };
  }

  return {
    enableModeration: row.enable_moderation,
    enableActivity: row.enable_activity,
    enableInfractions: row.enable_infractions,
    enableSessions: row.enable_sessions,
    enableDepartments: row.enable_departments,
    enableAlerts: row.enable_alerts,
    enableRbac: row.enable_rbac,
    enableTeams: row.enable_teams,
    enableWorkflows: row.enable_workflows,
    enableAppeals: row.enable_appeals,
    enableAutomation: row.enable_automation,
    enableProfiles: row.enable_profiles,
    enableLogs: row.enable_logs,
    enableRealtime: row.enable_realtime,
    enableCommands: row.enable_commands,
    enableBackups: row.enable_backups,
    enableApiKeys: row.enable_api_keys,
    enableObservability: row.enable_observability,
    enableBilling: row.enable_billing,
  };
}

export async function upsertOnboardingPreferences(
  userId: string,
  preferences: OnboardingPreferences,
): Promise<OnboardingPreferences> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    enable_moderation: boolean;
    enable_activity: boolean;
    enable_infractions: boolean;
    enable_sessions: boolean;
    enable_departments: boolean;
    enable_alerts: boolean;
    enable_rbac: boolean;
    enable_teams: boolean;
    enable_workflows: boolean;
    enable_appeals: boolean;
    enable_automation: boolean;
    enable_profiles: boolean;
    enable_logs: boolean;
    enable_realtime: boolean;
    enable_commands: boolean;
    enable_backups: boolean;
    enable_api_keys: boolean;
    enable_observability: boolean;
    enable_billing: boolean;
  }>(
    `
      INSERT INTO onboarding_preferences (
        discord_user_id,
        enable_moderation,
        enable_activity,
        enable_infractions,
        enable_sessions,
        enable_departments,
        enable_alerts,
        enable_rbac,
        enable_teams,
        enable_workflows,
        enable_appeals,
        enable_automation,
        enable_profiles,
        enable_logs,
        enable_realtime,
        enable_commands,
        enable_backups,
        enable_api_keys,
        enable_observability,
        enable_billing,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        enable_moderation = EXCLUDED.enable_moderation,
        enable_activity = EXCLUDED.enable_activity,
        enable_infractions = EXCLUDED.enable_infractions,
        enable_sessions = EXCLUDED.enable_sessions,
        enable_departments = EXCLUDED.enable_departments,
        enable_alerts = EXCLUDED.enable_alerts,
        enable_rbac = EXCLUDED.enable_rbac,
        enable_teams = EXCLUDED.enable_teams,
        enable_workflows = EXCLUDED.enable_workflows,
        enable_appeals = EXCLUDED.enable_appeals,
        enable_automation = EXCLUDED.enable_automation,
        enable_profiles = EXCLUDED.enable_profiles,
        enable_logs = EXCLUDED.enable_logs,
        enable_realtime = EXCLUDED.enable_realtime,
        enable_commands = EXCLUDED.enable_commands,
        enable_backups = EXCLUDED.enable_backups,
        enable_api_keys = EXCLUDED.enable_api_keys,
        enable_observability = EXCLUDED.enable_observability,
        enable_billing = EXCLUDED.enable_billing,
        updated_at = NOW()
      RETURNING
        enable_moderation,
        enable_activity,
        enable_infractions,
        enable_sessions,
        enable_departments,
        enable_alerts,
        enable_rbac,
        enable_teams,
        enable_workflows,
        enable_appeals,
        enable_automation,
        enable_profiles,
        enable_logs,
        enable_realtime,
        enable_commands,
        enable_backups,
        enable_api_keys,
        enable_observability,
        enable_billing
    `,
    [
      userId,
      preferences.enableModeration,
      preferences.enableActivity,
      preferences.enableInfractions,
      preferences.enableSessions,
      preferences.enableDepartments,
      preferences.enableAlerts,
      preferences.enableRbac,
      preferences.enableTeams,
      preferences.enableWorkflows,
      preferences.enableAppeals,
      preferences.enableAutomation,
      preferences.enableProfiles,
      preferences.enableLogs,
      preferences.enableRealtime,
      preferences.enableCommands,
      preferences.enableBackups,
      preferences.enableApiKeys,
      preferences.enableObservability,
      preferences.enableBilling,
    ],
  );

  const row = result.rows[0];
  return {
    enableModeration: row.enable_moderation,
    enableActivity: row.enable_activity,
    enableInfractions: row.enable_infractions,
    enableSessions: row.enable_sessions,
    enableDepartments: row.enable_departments,
    enableAlerts: row.enable_alerts,
    enableRbac: row.enable_rbac,
    enableTeams: row.enable_teams,
    enableWorkflows: row.enable_workflows,
    enableAppeals: row.enable_appeals,
    enableAutomation: row.enable_automation,
    enableProfiles: row.enable_profiles,
    enableLogs: row.enable_logs,
    enableRealtime: row.enable_realtime,
    enableCommands: row.enable_commands,
    enableBackups: row.enable_backups,
    enableApiKeys: row.enable_api_keys,
    enableObservability: row.enable_observability,
    enableBilling: row.enable_billing,
  };
}

const FEATURE_KEY_ALLOWLIST = new Set([
  "rbac",
  "teams",
  "workflows",
  "appeals",
  "automation",
  "profiles",
  "logs",
  "realtime",
  "commands",
  "backups",
  "api_keys",
  "observability",
  "billing",
]);

export function isSupportedFeatureKey(featureKey: string): boolean {
  return FEATURE_KEY_ALLOWLIST.has(featureKey);
}

export async function listFeatureEntries(userId: string, featureKey: string): Promise<FeatureEntry[]> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    feature_key: string;
    title: string;
    status: string;
    payload: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>(
    `
      SELECT id, feature_key, title, status, payload, created_at, updated_at
      FROM workspace_feature_entries
      WHERE discord_user_id = $1 AND feature_key = $2
      ORDER BY updated_at DESC
      LIMIT 200
    `,
    [userId, featureKey],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    feature: row.feature_key,
    title: row.title,
    status: row.status,
    payload: row.payload ?? {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));
}

export async function createFeatureEntry(input: {
  userId: string;
  featureKey: string;
  title: string;
  status?: string;
  payload?: Record<string, unknown>;
}): Promise<FeatureEntry> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    feature_key: string;
    title: string;
    status: string;
    payload: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>(
    `
      INSERT INTO workspace_feature_entries (
        discord_user_id,
        feature_key,
        title,
        status,
        payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
      RETURNING id, feature_key, title, status, payload, created_at, updated_at
    `,
    [
      input.userId,
      input.featureKey,
      input.title.trim(),
      input.status?.trim() || "Active",
      JSON.stringify(input.payload ?? {}),
    ],
  );

  const row = result.rows[0];
  await createActivityEvent({
    userId: input.userId,
    actor: "System",
    eventType: "Feature",
    context: `Created ${input.featureKey} entry: ${row.title}`,
  });

  return {
    id: Number(row.id),
    feature: row.feature_key,
    title: row.title,
    status: row.status,
    payload: row.payload ?? {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function updateFeatureEntry(input: {
  userId: string;
  id: number;
  title?: string;
  status?: string;
  payload?: Record<string, unknown>;
}): Promise<FeatureEntry | null> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    feature_key: string;
    title: string;
    status: string;
    payload: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>(
    `
      UPDATE workspace_feature_entries
      SET
        title = COALESCE(NULLIF($3, ''), title),
        status = COALESCE(NULLIF($4, ''), status),
        payload = COALESCE($5::jsonb, payload),
        updated_at = NOW()
      WHERE discord_user_id = $1 AND id = $2
      RETURNING id, feature_key, title, status, payload, created_at, updated_at
    `,
    [
      input.userId,
      input.id,
      input.title?.trim() ?? "",
      input.status?.trim() ?? "",
      input.payload ? JSON.stringify(input.payload) : null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  await createActivityEvent({
    userId: input.userId,
    actor: "System",
    eventType: "Feature",
    context: `Updated ${row.feature_key} entry: ${row.title}`,
  });

  return {
    id: Number(row.id),
    feature: row.feature_key,
    title: row.title,
    status: row.status,
    payload: row.payload ?? {},
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function getModerationCases(userId: string): Promise<ModerationCase[]> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    case_ref: string;
    case_type: string;
    player_name: string;
    status: string;
    owner_name: string;
    created_at: string;
  }>(
    `
      SELECT id, case_ref, case_type, player_name, status, owner_name, created_at
      FROM moderation_cases
      WHERE discord_user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [userId],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    caseRef: row.case_ref,
    type: row.case_type,
    player: row.player_name,
    status: row.status,
    owner: row.owner_name,
    createdAt: toIso(row.created_at),
  }));
}

export async function addModerationCase(input: {
  userId: string;
  type: string;
  player: string;
  owner: string;
  status?: string;
}): Promise<ModerationCase> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const caseRef = input.type.toLowerCase().includes("command")
    ? createCaseRef("CMD")
    : createCaseRef("MC");

  const result = await pool.query<{
    id: string;
    case_ref: string;
    case_type: string;
    player_name: string;
    status: string;
    owner_name: string;
    created_at: string;
  }>(
    `
      INSERT INTO moderation_cases (
        discord_user_id,
        case_ref,
        case_type,
        player_name,
        status,
        owner_name,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, case_ref, case_type, player_name, status, owner_name, created_at
    `,
    [
      input.userId,
      caseRef,
      input.type.trim(),
      input.player.trim(),
      input.status?.trim() || "Queued",
      input.owner.trim() || "Unassigned",
    ],
  );

  const row = result.rows[0];
  await createActivityEvent({
    userId: input.userId,
    actor: input.owner || "System",
    eventType: "Moderation",
    context: `Opened case ${row.case_ref} for ${row.player_name}`,
  });

  return {
    id: Number(row.id),
    caseRef: row.case_ref,
    type: row.case_type,
    player: row.player_name,
    status: row.status,
    owner: row.owner_name,
    createdAt: toIso(row.created_at),
  };
}

export async function updateModerationCase(input: {
  userId: string;
  id: number;
  status: string;
  owner: string;
}): Promise<ModerationCase | null> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    case_ref: string;
    case_type: string;
    player_name: string;
    status: string;
    owner_name: string;
    created_at: string;
  }>(
    `
      UPDATE moderation_cases
      SET status = $3, owner_name = $4
      WHERE discord_user_id = $1 AND id = $2
      RETURNING id, case_ref, case_type, player_name, status, owner_name, created_at
    `,
    [input.userId, input.id, input.status.trim(), input.owner.trim() || "Unassigned"],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  await createActivityEvent({
    userId: input.userId,
    actor: input.owner || "System",
    eventType: "Moderation",
    context: `Updated ${row.case_ref} to ${row.status}`,
  });

  return {
    id: Number(row.id),
    caseRef: row.case_ref,
    type: row.case_type,
    player: row.player_name,
    status: row.status,
    owner: row.owner_name,
    createdAt: toIso(row.created_at),
  };
}

export async function getInfractions(userId: string): Promise<{
  stats: Array<{ type: string; count: number }>;
  cases: InfractionCase[];
}> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();

  const [casesResult, statsResult] = await Promise.all([
    pool.query<{
      id: string;
      case_ref: string;
      target_name: string;
      level: string;
      issuer_name: string;
      appeal_status: string;
      created_at: string;
    }>(
      `
        SELECT id, case_ref, target_name, level, issuer_name, appeal_status, created_at
        FROM infractions
        WHERE discord_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [userId],
    ),
    pool.query<{ level: string; count: string }>(
      `
        SELECT level, COUNT(*)::TEXT AS count
        FROM infractions
        WHERE discord_user_id = $1
        GROUP BY level
      `,
      [userId],
    ),
  ]);

  const statsMap = new Map<string, number>();
  for (const row of statsResult.rows) {
    statsMap.set(row.level.toLowerCase(), Number(row.count));
  }

  const stats = ["Warning", "Strike", "Suspension", "Termination"].map((level) => ({
    type: `${level}s`,
    count: statsMap.get(level.toLowerCase()) ?? 0,
  }));

  const cases = casesResult.rows.map((row) => ({
    id: Number(row.id),
    caseRef: row.case_ref,
    target: row.target_name,
    level: row.level,
    issuer: row.issuer_name,
    appealStatus: row.appeal_status,
    createdAt: toIso(row.created_at),
  }));

  return { stats, cases };
}

export async function addInfraction(input: {
  userId: string;
  target: string;
  level: string;
  issuer: string;
  appealStatus?: string;
}): Promise<InfractionCase> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const caseRef = createCaseRef("INF");

  const result = await pool.query<{
    id: string;
    case_ref: string;
    target_name: string;
    level: string;
    issuer_name: string;
    appeal_status: string;
    created_at: string;
  }>(
    `
      INSERT INTO infractions (
        discord_user_id,
        case_ref,
        target_name,
        level,
        issuer_name,
        appeal_status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, case_ref, target_name, level, issuer_name, appeal_status, created_at
    `,
    [
      input.userId,
      caseRef,
      input.target.trim(),
      input.level.trim(),
      input.issuer.trim(),
      input.appealStatus?.trim() || "Open",
    ],
  );

  const row = result.rows[0];

  await createActivityEvent({
    userId: input.userId,
    actor: input.issuer,
    eventType: "Infraction",
    context: `Issued ${row.case_ref} (${row.level}) to ${row.target_name}`,
    responseSeconds: 210,
  });

  if (["suspension", "termination"].includes(row.level.toLowerCase())) {
    await createAlert({
      userId: input.userId,
      level: "Critical",
      source: "Infractions",
      event: `${row.level} recorded for ${row.target_name} (${row.case_ref})`,
    });
  }

  return {
    id: Number(row.id),
    caseRef: row.case_ref,
    target: row.target_name,
    level: row.level,
    issuer: row.issuer_name,
    appealStatus: row.appeal_status,
    createdAt: toIso(row.created_at),
  };
}

export async function getSessionsPanel(userId: string): Promise<{
  upcoming: SessionRecord[];
  performance: Array<{ label: string; value: string }>;
}> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();

  const [sessionsResult, metricsResult, moderationLoadResult] = await Promise.all([
    pool.query<{
      id: string;
      title: string;
      starts_at: string;
      host_name: string;
      staffing_current: number;
      staffing_target: number;
      status: string;
      rating: string | null;
      created_at: string;
    }>(
      `
        SELECT id, title, starts_at, host_name, staffing_current, staffing_target, status, rating, created_at
        FROM sessions
        WHERE discord_user_id = $1
        ORDER BY starts_at ASC
        LIMIT 100
      `,
      [userId],
    ),
    pool.query<{
      avg_attendance: string | null;
      peak_staffing: string | null;
      avg_rating: string | null;
    }>(
      `
        SELECT
          AVG(
            CASE WHEN staffing_target > 0
              THEN (staffing_current::DECIMAL / staffing_target::DECIMAL) * 100
              ELSE NULL
            END
          ) AS avg_attendance,
          MAX(staffing_current) AS peak_staffing,
          AVG(rating) AS avg_rating
        FROM sessions
        WHERE discord_user_id = $1
      `,
      [userId],
    ),
    pool.query<{ moderation_load: string | null }>(
      `
        SELECT
          CASE WHEN COUNT(DISTINCT s.id) = 0
            THEN NULL
            ELSE ROUND(COUNT(m.id)::DECIMAL / COUNT(DISTINCT s.id), 2)::TEXT
          END AS moderation_load
        FROM sessions s
        LEFT JOIN moderation_cases m
          ON m.discord_user_id = s.discord_user_id
        WHERE s.discord_user_id = $1
      `,
      [userId],
    ),
  ]);

  const upcoming = sessionsResult.rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    startsAt: toIso(row.starts_at),
    host: row.host_name,
    staffingCurrent: row.staffing_current,
    staffingTarget: row.staffing_target,
    status: row.status,
    rating: row.rating ? Number(row.rating) : null,
    createdAt: toIso(row.created_at),
  }));

  const metric = metricsResult.rows[0];
  const avgAttendance = metric?.avg_attendance ? Number(metric.avg_attendance) : null;
  const peakStaffing = metric?.peak_staffing ? Number(metric.peak_staffing) : null;
  const avgRating = metric?.avg_rating ? Number(metric.avg_rating) : null;
  const moderationLoad = moderationLoadResult.rows[0]?.moderation_load ?? null;

  return {
    upcoming,
    performance: [
      { label: "Average attendance", value: avgAttendance !== null ? `${Math.round(avgAttendance)}%` : "N/A" },
      { label: "Peak staffed slots", value: peakStaffing !== null ? String(peakStaffing) : "N/A" },
      { label: "Moderation load/session", value: moderationLoad ? `${moderationLoad} events` : "N/A" },
      { label: "Average session rating", value: avgRating !== null ? `${avgRating.toFixed(1)}/5` : "N/A" },
    ],
  };
}

export async function addSession(input: {
  userId: string;
  title: string;
  startsAt: string;
  host: string;
  staffingTarget: number;
}): Promise<SessionRecord> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    title: string;
    starts_at: string;
    host_name: string;
    staffing_current: number;
    staffing_target: number;
    status: string;
    rating: string | null;
    created_at: string;
  }>(
    `
      INSERT INTO sessions (
        discord_user_id,
        title,
        starts_at,
        host_name,
        staffing_current,
        staffing_target,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, 0, $5, 'Scheduled', NOW())
      RETURNING id, title, starts_at, host_name, staffing_current, staffing_target, status, rating, created_at
    `,
    [input.userId, input.title.trim(), input.startsAt, input.host.trim(), Math.max(1, input.staffingTarget)],
  );

  const row = result.rows[0];

  await createActivityEvent({
    userId: input.userId,
    actor: input.host,
    eventType: "Session",
    context: `Created session ${row.title}`,
    responseSeconds: 120,
  });

  await createAlert({
    userId: input.userId,
    level: "Info",
    source: "Sessions",
    event: `Session scheduled: ${row.title}`,
  });

  return {
    id: Number(row.id),
    title: row.title,
    startsAt: toIso(row.starts_at),
    host: row.host_name,
    staffingCurrent: row.staffing_current,
    staffingTarget: row.staffing_target,
    status: row.status,
    rating: row.rating ? Number(row.rating) : null,
    createdAt: toIso(row.created_at),
  };
}

export async function getDepartments(userId: string): Promise<{
  departments: DepartmentRecord[];
  permissionBands: Array<{ level: string; rights: string }>;
}> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    name: string;
    lead_name: string;
    members: number;
    scope: string;
    created_at: string;
  }>(
    `
      SELECT id, name, lead_name, members, scope, created_at
      FROM departments
      WHERE discord_user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return {
    departments: result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      lead: row.lead_name,
      members: row.members,
      scope: row.scope,
      createdAt: toIso(row.created_at),
    })),
    permissionBands: [
      { level: "Owner/Admin", rights: "Workspace settings, command policy, retention control" },
      { level: "Moderator", rights: "Moderation actions, infractions logging, session operations" },
      { level: "Viewer", rights: "Read-only dashboards and logs" },
    ],
  };
}

export async function addDepartment(input: {
  userId: string;
  name: string;
  lead: string;
  members: number;
  scope: string;
}): Promise<DepartmentRecord> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    name: string;
    lead_name: string;
    members: number;
    scope: string;
    created_at: string;
  }>(
    `
      INSERT INTO departments (discord_user_id, name, lead_name, members, scope, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, name, lead_name, members, scope, created_at
    `,
    [input.userId, input.name.trim(), input.lead.trim(), Math.max(0, input.members), input.scope.trim()],
  );

  const row = result.rows[0];
  await createActivityEvent({
    userId: input.userId,
    actor: input.lead,
    eventType: "Department",
    context: `Created department ${row.name}`,
  });

  return {
    id: Number(row.id),
    name: row.name,
    lead: row.lead_name,
    members: row.members,
    scope: row.scope,
    createdAt: toIso(row.created_at),
  };
}

export async function getAlerts(userId: string): Promise<{
  feed: AlertRecord[];
  webhookStatus: Array<{ name: string; status: string; retries: string }>;
}> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();
  const [alertsResult, settings, botIntegration] = await Promise.all([
    pool.query<{
      id: string;
      level: string;
      event_text: string;
      source: string;
      created_at: string;
    }>(
      `
        SELECT id, level, event_text, source, created_at
        FROM alerts
        WHERE discord_user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [userId],
    ),
    getWorkspaceSettings(userId),
    getDiscordBotIntegration(userId),
  ]);

  return {
    feed: alertsResult.rows.map((row) => ({
      id: Number(row.id),
      level: row.level,
      event: row.event_text,
      source: row.source,
      createdAt: toIso(row.created_at),
    })),
    webhookStatus: [
      {
        name: "Discord webhook",
        status: settings.webhookUrl ? "Configured" : "Not configured",
        retries: "0",
      },
      {
        name: "Discord bot",
        status:
          botIntegration.enabled && botIntegration.guildId && botIntegration.alertsChannelId
            ? "Configured"
            : "Not configured",
        retries: "0",
      },
    ],
  };
}

export async function getActivityPanel(userId: string): Promise<{
  kpis: ActivityKpis;
  leaderboard: ActivityLeaderboardRow[];
}> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();

  const [kpiResult, leaderboardResult] = await Promise.all([
    pool.query<{
      actions_24h: string;
      avg_response_seconds: string | null;
      attendance_pct: string | null;
      active_staff: string;
    }>(
      `
        WITH attendance AS (
          SELECT AVG(
            CASE
              WHEN staffing_target > 0 THEN (staffing_current::DECIMAL / staffing_target::DECIMAL) * 100
              ELSE NULL
            END
          ) AS attendance_pct
          FROM sessions
          WHERE discord_user_id = $1
        )
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::TEXT AS actions_24h,
          AVG(response_seconds) AS avg_response_seconds,
          (SELECT attendance_pct FROM attendance)::TEXT AS attendance_pct,
          COUNT(DISTINCT actor_name) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::TEXT AS active_staff
        FROM activity_events
        WHERE discord_user_id = $1
      `,
      [userId],
    ),
    pool.query<{
      name: string;
      actions: string;
      sessions: string;
    }>(
      `
        WITH action_counts AS (
          SELECT actor_name AS name, COUNT(*)::INT AS actions
          FROM activity_events
          WHERE discord_user_id = $1
          GROUP BY actor_name
        ),
        session_counts AS (
          SELECT host_name AS name, COUNT(*)::INT AS sessions
          FROM sessions
          WHERE discord_user_id = $1
          GROUP BY host_name
        )
        SELECT
          COALESCE(a.name, s.name) AS name,
          COALESCE(a.actions, 0)::TEXT AS actions,
          COALESCE(s.sessions, 0)::TEXT AS sessions
        FROM action_counts a
        FULL OUTER JOIN session_counts s ON s.name = a.name
        ORDER BY COALESCE(a.actions, 0) DESC, COALESCE(s.sessions, 0) DESC
        LIMIT 12
      `,
      [userId],
    ),
  ]);

  const kpi = kpiResult.rows[0];
  const parsedKpis: ActivityKpis = {
    staffActions24h: Number(kpi?.actions_24h ?? "0"),
    averageResponseSeconds: kpi?.avg_response_seconds ? Number(kpi.avg_response_seconds) : null,
    attendanceCompliancePct: kpi?.attendance_pct ? Number(kpi.attendance_pct) : null,
    activeStaffNow: Number(kpi?.active_staff ?? "0"),
  };

  const leaderboard = leaderboardResult.rows.map((row) => {
    const actions = Number(row.actions);
    return {
      name: row.name,
      sessions: Number(row.sessions),
      actions,
      score: getScoreFromActions(actions),
    };
  });

  return { kpis: parsedKpis, leaderboard };
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();

  const [countsResult, feedResult] = await Promise.all([
    pool.query<{
      open_moderation: string;
      activity_24h: string;
      upcoming_sessions: string;
      pending_infractions: string;
    }>(
      `
        SELECT
          (SELECT COUNT(*)::TEXT FROM moderation_cases WHERE discord_user_id = $1 AND status NOT IN ('Resolved', 'Closed')) AS open_moderation,
          (SELECT COUNT(*)::TEXT FROM activity_events WHERE discord_user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours') AS activity_24h,
          (SELECT COUNT(*)::TEXT FROM sessions WHERE discord_user_id = $1 AND starts_at >= NOW()) AS upcoming_sessions,
          (SELECT COUNT(*)::TEXT FROM infractions WHERE discord_user_id = $1 AND appeal_status IN ('Open', 'Pending')) AS pending_infractions
      `,
      [userId],
    ),
    pool.query<{
      label: string;
      level: string;
      created_at: string;
    }>(
      `
        SELECT event_text AS label, level, created_at
        FROM alerts
        WHERE discord_user_id = $1
        ORDER BY created_at DESC
        LIMIT 6
      `,
      [userId],
    ),
  ]);

  const counts = countsResult.rows[0];
  return {
    cards: [
      {
        title: "Server status",
        value: "Operational",
        details: `Open moderation items: ${counts?.open_moderation ?? "0"}`,
      },
      {
        title: "Staff activity",
        value: `${counts?.activity_24h ?? "0"} actions`,
        details: "Actions recorded in the past 24 hours",
      },
      {
        title: "Session monitor",
        value: `${counts?.upcoming_sessions ?? "0"} upcoming`,
        details: "Upcoming scheduled sessions",
      },
      {
        title: "Infractions queue",
        value: `${counts?.pending_infractions ?? "0"} pending`,
        details: "Appeals currently marked open or pending",
      },
    ],
    feed: feedResult.rows.map((row) => ({
      time: formatRelativeTime(row.created_at),
      label: row.label,
      level: row.level,
    })),
    nextActions: [
      { label: "Review moderation queue", href: "/moderation" },
      { label: "Open staff activity panel", href: "/activity" },
      { label: "Manage session board", href: "/sessions" },
    ],
  };
}

export async function getOnboardingSummary(
  userId: string,
  options?: { erlcConnected?: boolean; enabledModulesCount?: number },
): Promise<
  Array<{ step: string; status: "Complete" | "In progress" | "Pending"; detail: string }>
> {
  await ensureWorkspaceSchema();
  const pool = getDbPool();

  const result = await pool.query<{
    departments_count: string;
    retention_days: string;
    webhook_configured: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*)::TEXT FROM departments WHERE discord_user_id = $1) AS departments_count,
        (SELECT retention_days::TEXT FROM workspace_settings WHERE discord_user_id = $1) AS retention_days,
        (SELECT CASE WHEN webhook_url IS NULL OR webhook_url = '' THEN '0' ELSE '1' END
          FROM workspace_settings WHERE discord_user_id = $1) AS webhook_configured
    `,
    [userId],
  );

  const row = result.rows[0];
  const departments = Number(row?.departments_count ?? "0");
  const retentionDays = Number(row?.retention_days ?? "0");
  const webhook = Number(row?.webhook_configured ?? "0");
  const erlcConnected = options?.erlcConnected ?? false;
  const enabledModulesCount = options?.enabledModulesCount ?? 0;
  const coreSettingsReady = retentionDays === 30 || retentionDays === 90;
  const readinessComplete = enabledModulesCount > 0 && erlcConnected && coreSettingsReady;

  return [
    {
      step: "Create workspace",
      status: "Complete",
      detail: "Workspace profile and ownership established.",
    },
    {
      step: "Choose enabled modules",
      status: enabledModulesCount > 0 ? "Complete" : "In progress",
      detail:
        enabledModulesCount > 0
          ? `${enabledModulesCount} module(s) enabled for launch.`
          : "Select which modules to enable in your workspace.",
    },
    {
      step: "Configure core settings",
      status: coreSettingsReady ? "Complete" : "In progress",
      detail: coreSettingsReady
        ? `Retention policy set (${retentionDays} days).`
        : "Set retention and core workspace defaults.",
    },
    {
      step: "Connect ER:LC server",
      status: erlcConnected ? "Complete" : "In progress",
      detail: erlcConnected ? "ER:LC key connected and validated." : "Add your ER:LC Server-Key to activate live server data.",
    },
    {
      step: "Define departments",
      status: departments > 0 ? "Complete" : "Pending",
      detail: departments > 0 ? `${departments} department(s) configured.` : "Department structure not configured.",
    },
    {
      step: "Configure alerts",
      status: webhook > 0 ? "Complete" : "In progress",
      detail: webhook > 0 ? "Discord webhook is configured." : "Webhook URL can be added now or later.",
    },
    {
      step: "Launch readiness",
      status: readinessComplete ? "Complete" : "In progress",
      detail: readinessComplete
        ? "Workspace is ready. Onboarding will be hidden."
        : "Complete module selection and ER:LC connection to finish onboarding.",
    },
  ];
}
