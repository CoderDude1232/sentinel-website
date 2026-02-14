import { getDbPool } from "@/lib/db";

declare global {
  var sentinelOpsSchemaReady: boolean | undefined;
}

export type CommandPolicy = {
  allowlist: string[];
  requiresApproval: boolean;
  cooldownSeconds: number;
};

export type CommandExecutionRecord = {
  id: number;
  command: string;
  targetPlayer: string;
  actor: string;
  result: "Queued" | "Executed" | "Blocked";
  source: "dashboard" | "automation";
  notes: string | null;
  createdAt: string;
};

export type InfractionPolicy = {
  warningPoints: number;
  strikePoints: number;
  suspensionPoints: number;
  terminationPoints: number;
  autoSuspendThreshold: number;
  autoTerminationThreshold: number;
};

export type SessionAutomationSettings = {
  announcementTemplate: string;
  announceChannel: string | null;
  pollEnabled: boolean;
  autoEndWhenEmpty: boolean;
};

export type AuditEvent = {
  id: number;
  module: string;
  action: string;
  actor: string;
  subject: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const DEFAULT_COMMAND_POLICY: CommandPolicy = {
  allowlist: [":announce", ":pm", ":warn", ":kick", ":ban", ":tban", ":unban", ":tp"],
  requiresApproval: true,
  cooldownSeconds: 15,
};

const LEGACY_DEFAULT_COMMAND_ALLOWLIST = [":announce", ":pm", ":warn", ":tp"];

function normalizeAllowlist(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean).sort();
}

function isLegacyDefaultAllowlist(values: string[]): boolean {
  const normalized = normalizeAllowlist(values);
  const legacy = normalizeAllowlist(LEGACY_DEFAULT_COMMAND_ALLOWLIST);
  if (normalized.length !== legacy.length) {
    return false;
  }
  return normalized.every((entry, index) => entry === legacy[index]);
}

const DEFAULT_INFRACTION_POLICY: InfractionPolicy = {
  warningPoints: 1,
  strikePoints: 3,
  suspensionPoints: 5,
  terminationPoints: 8,
  autoSuspendThreshold: 8,
  autoTerminationThreshold: 12,
};

const DEFAULT_SESSION_AUTOMATION: SessionAutomationSettings = {
  announcementTemplate:
    "Session {title} starts at {startsAt}. Current players: {playerCount}. Queue: {queueCount}.",
  announceChannel: null,
  pollEnabled: false,
  autoEndWhenEmpty: false,
};

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => Boolean(item));
  return normalized.length ? normalized : fallback;
}

export async function ensureOpsSchema(): Promise<void> {
  if (global.sentinelOpsSchemaReady) {
    return;
  }

  const pool = getDbPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS command_policies (
      discord_user_id TEXT PRIMARY KEY,
      allowlist JSONB NOT NULL DEFAULT '[]'::jsonb,
      requires_approval BOOLEAN NOT NULL DEFAULT true,
      cooldown_seconds INTEGER NOT NULL DEFAULT 15,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS command_executions (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      command_text TEXT NOT NULL,
      target_player TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      result_text TEXT NOT NULL,
      source_text TEXT NOT NULL DEFAULT 'dashboard',
      notes_text TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS infraction_policies (
      discord_user_id TEXT PRIMARY KEY,
      warning_points INTEGER NOT NULL DEFAULT 1,
      strike_points INTEGER NOT NULL DEFAULT 3,
      suspension_points INTEGER NOT NULL DEFAULT 5,
      termination_points INTEGER NOT NULL DEFAULT 8,
      auto_suspend_threshold INTEGER NOT NULL DEFAULT 8,
      auto_termination_threshold INTEGER NOT NULL DEFAULT 12,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_automation_settings (
      discord_user_id TEXT PRIMARY KEY,
      announcement_template TEXT NOT NULL DEFAULT 'Session {title} starts at {startsAt}. Current players: {playerCount}. Queue: {queueCount}.',
      announce_channel TEXT NULL,
      poll_enabled BOOLEAN NOT NULL DEFAULT false,
      auto_end_when_empty BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGSERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      module_name TEXT NOT NULL,
      action_name TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      subject_text TEXT NULL,
      before_state JSONB NULL,
      after_state JSONB NULL,
      metadata JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_command_exec_user_created ON command_executions (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_events (discord_user_id, created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user_module ON audit_events (discord_user_id, module_name, created_at DESC);`);

  global.sentinelOpsSchemaReady = true;
}

export async function getCommandPolicy(userId: string): Promise<CommandPolicy> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    allowlist: unknown;
    requires_approval: boolean;
    cooldown_seconds: number;
  }>(
    `
      SELECT allowlist, requires_approval, cooldown_seconds
      FROM command_policies
      WHERE discord_user_id = $1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return { ...DEFAULT_COMMAND_POLICY };
  }

  const parsedPolicy: CommandPolicy = {
    allowlist: parseStringArray(row.allowlist, DEFAULT_COMMAND_POLICY.allowlist),
    requiresApproval: row.requires_approval,
    cooldownSeconds: Math.max(0, Number(row.cooldown_seconds ?? DEFAULT_COMMAND_POLICY.cooldownSeconds)),
  };

  if (isLegacyDefaultAllowlist(parsedPolicy.allowlist)) {
    await upsertCommandPolicy(userId, {
      ...parsedPolicy,
      allowlist: DEFAULT_COMMAND_POLICY.allowlist,
    });
    return {
      ...parsedPolicy,
      allowlist: DEFAULT_COMMAND_POLICY.allowlist,
    };
  }

  return parsedPolicy;
}

export async function upsertCommandPolicy(userId: string, policy: CommandPolicy): Promise<CommandPolicy> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const allowlist = Array.from(new Set(policy.allowlist.map((item) => item.trim()).filter(Boolean)));
  const cooldownSeconds = Math.max(0, Math.floor(policy.cooldownSeconds));

  const result = await pool.query<{
    allowlist: unknown;
    requires_approval: boolean;
    cooldown_seconds: number;
  }>(
    `
      INSERT INTO command_policies (
        discord_user_id,
        allowlist,
        requires_approval,
        cooldown_seconds,
        created_at,
        updated_at
      )
      VALUES ($1, $2::jsonb, $3, $4, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        allowlist = EXCLUDED.allowlist,
        requires_approval = EXCLUDED.requires_approval,
        cooldown_seconds = EXCLUDED.cooldown_seconds,
        updated_at = NOW()
      RETURNING allowlist, requires_approval, cooldown_seconds
    `,
    [userId, JSON.stringify(allowlist), policy.requiresApproval, cooldownSeconds],
  );

  const row = result.rows[0];
  return {
    allowlist: parseStringArray(row.allowlist, DEFAULT_COMMAND_POLICY.allowlist),
    requiresApproval: row.requires_approval,
    cooldownSeconds: row.cooldown_seconds,
  };
}

export async function listCommandExecutions(userId: string, limit = 50): Promise<CommandExecutionRecord[]> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    command_text: string;
    target_player: string;
    actor_name: string;
    result_text: string;
    source_text: string;
    notes_text: string | null;
    created_at: string;
  }>(
    `
      SELECT id, command_text, target_player, actor_name, result_text, source_text, notes_text, created_at
      FROM command_executions
      WHERE discord_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, Math.max(1, limit)],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    command: row.command_text,
    targetPlayer: row.target_player,
    actor: row.actor_name,
    result:
      row.result_text === "Executed" || row.result_text === "Blocked"
        ? row.result_text
        : "Queued",
    source: row.source_text === "automation" ? "automation" : "dashboard",
    notes: row.notes_text,
    createdAt: toIso(row.created_at),
  }));
}

export async function createCommandExecution(input: {
  userId: string;
  command: string;
  targetPlayer: string;
  actor: string;
  result: CommandExecutionRecord["result"];
  source?: CommandExecutionRecord["source"];
  notes?: string | null;
}): Promise<CommandExecutionRecord> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    id: string;
    command_text: string;
    target_player: string;
    actor_name: string;
    result_text: string;
    source_text: string;
    notes_text: string | null;
    created_at: string;
  }>(
    `
      INSERT INTO command_executions (
        discord_user_id,
        command_text,
        target_player,
        actor_name,
        result_text,
        source_text,
        notes_text,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, command_text, target_player, actor_name, result_text, source_text, notes_text, created_at
    `,
    [
      input.userId,
      input.command.trim(),
      input.targetPlayer.trim(),
      input.actor.trim(),
      input.result,
      input.source ?? "dashboard",
      input.notes?.trim() || null,
    ],
  );

  const row = result.rows[0];
  return {
    id: Number(row.id),
    command: row.command_text,
    targetPlayer: row.target_player,
    actor: row.actor_name,
    result: row.result_text === "Executed" || row.result_text === "Blocked" ? row.result_text : "Queued",
    source: row.source_text === "automation" ? "automation" : "dashboard",
    notes: row.notes_text,
    createdAt: toIso(row.created_at),
  };
}

export async function getInfractionPolicy(userId: string): Promise<InfractionPolicy> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    warning_points: number;
    strike_points: number;
    suspension_points: number;
    termination_points: number;
    auto_suspend_threshold: number;
    auto_termination_threshold: number;
  }>(
    `
      SELECT
        warning_points,
        strike_points,
        suspension_points,
        termination_points,
        auto_suspend_threshold,
        auto_termination_threshold
      FROM infraction_policies
      WHERE discord_user_id = $1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return { ...DEFAULT_INFRACTION_POLICY };
  }

  return {
    warningPoints: Math.max(0, row.warning_points),
    strikePoints: Math.max(0, row.strike_points),
    suspensionPoints: Math.max(0, row.suspension_points),
    terminationPoints: Math.max(0, row.termination_points),
    autoSuspendThreshold: Math.max(1, row.auto_suspend_threshold),
    autoTerminationThreshold: Math.max(1, row.auto_termination_threshold),
  };
}

export async function upsertInfractionPolicy(userId: string, policy: InfractionPolicy): Promise<InfractionPolicy> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const normalized = {
    warningPoints: Math.max(0, Math.floor(policy.warningPoints)),
    strikePoints: Math.max(0, Math.floor(policy.strikePoints)),
    suspensionPoints: Math.max(0, Math.floor(policy.suspensionPoints)),
    terminationPoints: Math.max(0, Math.floor(policy.terminationPoints)),
    autoSuspendThreshold: Math.max(1, Math.floor(policy.autoSuspendThreshold)),
    autoTerminationThreshold: Math.max(1, Math.floor(policy.autoTerminationThreshold)),
  };

  const result = await pool.query<{
    warning_points: number;
    strike_points: number;
    suspension_points: number;
    termination_points: number;
    auto_suspend_threshold: number;
    auto_termination_threshold: number;
  }>(
    `
      INSERT INTO infraction_policies (
        discord_user_id,
        warning_points,
        strike_points,
        suspension_points,
        termination_points,
        auto_suspend_threshold,
        auto_termination_threshold,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        warning_points = EXCLUDED.warning_points,
        strike_points = EXCLUDED.strike_points,
        suspension_points = EXCLUDED.suspension_points,
        termination_points = EXCLUDED.termination_points,
        auto_suspend_threshold = EXCLUDED.auto_suspend_threshold,
        auto_termination_threshold = EXCLUDED.auto_termination_threshold,
        updated_at = NOW()
      RETURNING
        warning_points,
        strike_points,
        suspension_points,
        termination_points,
        auto_suspend_threshold,
        auto_termination_threshold
    `,
    [
      userId,
      normalized.warningPoints,
      normalized.strikePoints,
      normalized.suspensionPoints,
      normalized.terminationPoints,
      normalized.autoSuspendThreshold,
      normalized.autoTerminationThreshold,
    ],
  );

  const row = result.rows[0];
  return {
    warningPoints: row.warning_points,
    strikePoints: row.strike_points,
    suspensionPoints: row.suspension_points,
    terminationPoints: row.termination_points,
    autoSuspendThreshold: row.auto_suspend_threshold,
    autoTerminationThreshold: row.auto_termination_threshold,
  };
}

export function pointsForInfractionLevel(level: string, policy: InfractionPolicy): number {
  const normalized = level.trim().toLowerCase();
  if (normalized === "warning") return policy.warningPoints;
  if (normalized === "strike") return policy.strikePoints;
  if (normalized === "suspension") return policy.suspensionPoints;
  if (normalized === "termination") return policy.terminationPoints;
  return 0;
}

export async function getSessionAutomationSettings(userId: string): Promise<SessionAutomationSettings> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const result = await pool.query<{
    announcement_template: string;
    announce_channel: string | null;
    poll_enabled: boolean;
    auto_end_when_empty: boolean;
  }>(
    `
      SELECT announcement_template, announce_channel, poll_enabled, auto_end_when_empty
      FROM session_automation_settings
      WHERE discord_user_id = $1
    `,
    [userId],
  );

  const row = result.rows[0];
  if (!row) {
    return { ...DEFAULT_SESSION_AUTOMATION };
  }

  return {
    announcementTemplate: row.announcement_template,
    announceChannel: row.announce_channel,
    pollEnabled: row.poll_enabled,
    autoEndWhenEmpty: row.auto_end_when_empty,
  };
}

export async function upsertSessionAutomationSettings(
  userId: string,
  settings: SessionAutomationSettings,
): Promise<SessionAutomationSettings> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const normalized: SessionAutomationSettings = {
    announcementTemplate:
      settings.announcementTemplate.trim() ||
      DEFAULT_SESSION_AUTOMATION.announcementTemplate,
    announceChannel: settings.announceChannel?.trim() || null,
    pollEnabled: Boolean(settings.pollEnabled),
    autoEndWhenEmpty: Boolean(settings.autoEndWhenEmpty),
  };

  const result = await pool.query<{
    announcement_template: string;
    announce_channel: string | null;
    poll_enabled: boolean;
    auto_end_when_empty: boolean;
  }>(
    `
      INSERT INTO session_automation_settings (
        discord_user_id,
        announcement_template,
        announce_channel,
        poll_enabled,
        auto_end_when_empty,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (discord_user_id)
      DO UPDATE SET
        announcement_template = EXCLUDED.announcement_template,
        announce_channel = EXCLUDED.announce_channel,
        poll_enabled = EXCLUDED.poll_enabled,
        auto_end_when_empty = EXCLUDED.auto_end_when_empty,
        updated_at = NOW()
      RETURNING announcement_template, announce_channel, poll_enabled, auto_end_when_empty
    `,
    [
      userId,
      normalized.announcementTemplate,
      normalized.announceChannel,
      normalized.pollEnabled,
      normalized.autoEndWhenEmpty,
    ],
  );

  const row = result.rows[0];
  return {
    announcementTemplate: row.announcement_template,
    announceChannel: row.announce_channel,
    pollEnabled: row.poll_enabled,
    autoEndWhenEmpty: row.auto_end_when_empty,
  };
}

export async function createAuditEvent(input: {
  userId: string;
  module: string;
  action: string;
  actor: string;
  subject?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await ensureOpsSchema();
  const pool = getDbPool();
  await pool.query(
    `
      INSERT INTO audit_events (
        discord_user_id,
        module_name,
        action_name,
        actor_name,
        subject_text,
        before_state,
        after_state,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, NOW())
    `,
    [
      input.userId,
      input.module.trim(),
      input.action.trim(),
      input.actor.trim() || "System",
      input.subject?.trim() || null,
      input.beforeState ? JSON.stringify(input.beforeState) : null,
      input.afterState ? JSON.stringify(input.afterState) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

export async function listAuditEvents(input: {
  userId: string;
  module?: string | null;
  action?: string | null;
  actor?: string | null;
  limit?: number;
}): Promise<AuditEvent[]> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const limit = Math.max(1, Math.min(500, input.limit ?? 100));
  const filters: string[] = ["discord_user_id = $1"];
  const values: unknown[] = [input.userId];

  if (input.module?.trim()) {
    values.push(input.module.trim());
    filters.push(`module_name = $${values.length}`);
  }
  if (input.action?.trim()) {
    values.push(input.action.trim());
    filters.push(`action_name = $${values.length}`);
  }
  if (input.actor?.trim()) {
    values.push(input.actor.trim());
    filters.push(`actor_name = $${values.length}`);
  }

  values.push(limit);

  const result = await pool.query<{
    id: string;
    module_name: string;
    action_name: string;
    actor_name: string;
    subject_text: string | null;
    before_state: unknown;
    after_state: unknown;
    metadata: unknown;
    created_at: string;
  }>(
    `
      SELECT
        id,
        module_name,
        action_name,
        actor_name,
        subject_text,
        before_state,
        after_state,
        metadata,
        created_at
      FROM audit_events
      WHERE ${filters.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    module: row.module_name,
    action: row.action_name,
    actor: row.actor_name,
    subject: row.subject_text,
    beforeState: asObject(row.before_state),
    afterState: asObject(row.after_state),
    metadata: asObject(row.metadata),
    createdAt: toIso(row.created_at),
  }));
}

export async function resetOpsData(userId: string): Promise<void> {
  await ensureOpsSchema();
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM command_executions WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM command_policies WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM infraction_policies WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM session_automation_settings WHERE discord_user_id = $1`, [userId]);
    await client.query(`DELETE FROM audit_events WHERE discord_user_id = $1`, [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
