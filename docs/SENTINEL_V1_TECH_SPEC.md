# Sentinel v1 Technical Specification

## 1. Scope

### 1.1 Product goals (v1)
- Build a production-ready web platform for ER:LC community operations.
- Support solo and team workspaces with role-based access.
- Integrate with PRC ER:LC API v1 for live server data and command operations.
- Provide core modules:
  - Moderation Panel
  - Activity Panel
  - Infractions Panel
  - Sessions
  - Departments
- Use Discord OAuth for authentication, with an auth model that is easy to extend later.

### 1.2 Out of scope (v1)
- Non-Discord login providers (Email, Google): data model included, UI can show "Coming soon".
- Public API for third-party clients.
- Multi-region active-active deployment.

## 2. Key rules and constraints

- PRC API version: v1 only.
- Every PRC request must include `Server-Key`; optional global `Authorization` token can be added later.
- Rate limiting must follow dynamic `X-RateLimit-*` response headers and handle 429 with `retry_after`.
- Real-time UX should use SSE/WebSocket from Sentinel backend; browser must never call PRC directly.
- Server key secrets must be encrypted at rest.
- Retention period is workspace-configurable: 30 or 90 days.
- Alerts in app + Discord webhooks.

## 3. Workspace and server limits

- Solo workspace: 1 server max.
- Team workspace: 2 servers max.
- Team definition: workspace with 2+ accepted members.
- Assumption for edge case:
  - If team shrinks below 2 members, existing second server remains connected.
  - Adding/replacing servers remains blocked until member count is 2+.

## 4. Architecture

## 4.1 Services
- `web` (Next.js on Vercel)
  - Public pages + app dashboard UI
  - API routes for CRUD, auth callbacks, webhooks, permissions
  - SSE endpoint for realtime updates
- `db` (PostgreSQL, managed)
  - Primary system of record
- `cache` (Redis, managed)
  - Hot cache for dashboard reads
  - Pub/sub event fanout
  - Rate-limit bucket state
  - Job coordination locks
- `worker` (long-running service, not serverless)
  - PRC polling and ingestion
  - Retention cleanup jobs
  - Notification dispatch

## 4.2 Data flow (ER:LC)
1. Worker polls PRC endpoints per connected server.
2. Worker writes normalized snapshots/events into Postgres.
3. Worker updates Redis cached views.
4. Worker publishes event to Redis pub/sub.
5. Web server pushes event to clients over SSE/WebSocket.

## 5. Authentication and authorization

## 5.1 Auth
- Discord OAuth2 Authorization Code flow.
- Required scope: `identify`.
- Store provider account in generic `auth_accounts` table for future providers.

## 5.2 RBAC
- Workspace roles: `Owner`, `Admin`, `Moderator`, `Viewer`.
- Departments are customizable and can be bound to permission scopes.
- Effective permissions = role baseline + department overrides.

## 5.3 Permissions baseline
- `Owner`: full control, billing/settings, retention, webhooks, role management.
- `Admin`: full operational control except ownership transfer/delete workspace.
- `Moderator`: moderation, infractions, session operations, limited settings.
- `Viewer`: read-only dashboards and logs.

## 6. Data model (initial)

## 6.1 Core tables
- `users`
  - `id`, `display_name`, `avatar_url`, `created_at`, `updated_at`
- `auth_accounts`
  - `id`, `user_id`, `provider`, `provider_user_id`, `email`, `access_token_encrypted`, `refresh_token_encrypted`, `expires_at`, `created_at`, `updated_at`
- `workspaces`
  - `id`, `name`, `slug`, `retention_days` (30/90), `created_by`, `created_at`, `updated_at`
- `workspace_members`
  - `id`, `workspace_id`, `user_id`, `role`, `status` (invited/active), `joined_at`
- `departments`
  - `id`, `workspace_id`, `name`, `description`, `created_at`, `updated_at`
- `department_members`
  - `id`, `department_id`, `user_id`, `workspace_id`, `created_at`
- `department_permissions`
  - `id`, `department_id`, `permission_key`, `allowed`

## 6.2 ER:LC integration tables
- `erlc_servers`
  - `id`, `workspace_id`, `name`, `server_key_encrypted`, `is_active`, `last_sync_at`, `created_at`, `updated_at`
- `erlc_sync_state`
  - `id`, `server_id`, `endpoint`, `last_success_at`, `last_error_code`, `last_error_message`, `next_eligible_at`
- `erlc_rate_limit_buckets`
  - `id`, `server_id`, `route_key`, `bucket_hash`, `limit_value`, `remaining`, `reset_at`, `updated_at`
- `erlc_command_audit_logs`
  - `id`, `workspace_id`, `server_id`, `actor_user_id`, `command_text`, `status`, `response_code`, `created_at`

## 6.3 Product feature tables
- `staff_activity_events`
  - `id`, `workspace_id`, `server_id`, `user_ref`, `event_type`, `metadata_json`, `occurred_at`
- `infractions`
  - `id`, `workspace_id`, `server_id`, `target_user_ref`, `infraction_type` (warning/strike/suspension/termination), `reason`, `evidence_url`, `duration_minutes`, `issued_by_user_id`, `appeal_status`, `created_at`
- `sessions`
  - `id`, `workspace_id`, `server_id`, `title`, `starts_at`, `ends_at`, `status`, `created_by_user_id`, `notes`
- `session_metrics`
  - `id`, `session_id`, `peak_player_count`, `avg_player_count`, `staff_attendance_count`, `moderation_events_count`, `commands_count`, `captured_at`
- `alerts`
  - `id`, `workspace_id`, `server_id`, `alert_type`, `title`, `body`, `severity`, `is_read`, `created_at`
- `webhook_configs`
  - `id`, `workspace_id`, `provider` (`discord`), `webhook_url_encrypted`, `is_active`, `events_json`, `created_at`, `updated_at`
- `notification_deliveries`
  - `id`, `webhook_config_id`, `event_type`, `status`, `response_code`, `attempt_count`, `last_attempt_at`

## 6.4 Compliance/security tables
- `audit_logs`
  - `id`, `workspace_id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `metadata_json`, `created_at`
- `security_events`
  - `id`, `workspace_id`, `event_type`, `ip_hash`, `user_agent_hash`, `metadata_json`, `created_at`

## 7. API routes (Sentinel backend)

## 7.1 Auth
- `GET /api/auth/discord/login`
- `GET /api/auth/discord/callback`
- `POST /api/auth/logout`
- `GET /api/auth/session`

## 7.2 Onboarding and workspace
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `POST /api/workspaces/:workspaceId/invites`
- `POST /api/workspaces/:workspaceId/invites/accept`
- `PATCH /api/workspaces/:workspaceId/settings`

## 7.3 Members, roles, departments
- `GET /api/workspaces/:workspaceId/members`
- `PATCH /api/workspaces/:workspaceId/members/:memberId`
- `POST /api/workspaces/:workspaceId/departments`
- `PATCH /api/workspaces/:workspaceId/departments/:departmentId`
- `DELETE /api/workspaces/:workspaceId/departments/:departmentId`
- `POST /api/workspaces/:workspaceId/departments/:departmentId/members`

## 7.4 ER:LC integration
- `POST /api/workspaces/:workspaceId/servers` (connect server key)
- `GET /api/workspaces/:workspaceId/servers`
- `GET /api/workspaces/:workspaceId/servers/:serverId/status`
- `POST /api/workspaces/:workspaceId/servers/:serverId/commands`

## 7.5 Dashboard modules
- `GET /api/workspaces/:workspaceId/moderation/overview`
- `GET /api/workspaces/:workspaceId/activity/overview`
- `GET /api/workspaces/:workspaceId/infractions`
- `POST /api/workspaces/:workspaceId/infractions`
- `PATCH /api/workspaces/:workspaceId/infractions/:infractionId`
- `GET /api/workspaces/:workspaceId/sessions`
- `POST /api/workspaces/:workspaceId/sessions`
- `GET /api/workspaces/:workspaceId/sessions/:sessionId/metrics`
- `GET /api/workspaces/:workspaceId/alerts`
- `PATCH /api/workspaces/:workspaceId/alerts/:alertId/read`

## 7.6 Webhooks
- `GET /api/workspaces/:workspaceId/webhooks`
- `POST /api/workspaces/:workspaceId/webhooks`
- `PATCH /api/workspaces/:workspaceId/webhooks/:webhookId`
- `POST /api/workspaces/:workspaceId/webhooks/:webhookId/test`

## 7.7 Realtime
- `GET /api/workspaces/:workspaceId/stream` (SSE)

## 8. PRC endpoints to integrate (worker)

Read endpoints:
- `/v1/server`
- `/v1/server/players`
- `/v1/server/queue`
- `/v1/server/joinlogs`
- `/v1/server/commandlogs`
- `/v1/server/killlogs`
- `/v1/server/modcalls`
- `/v1/server/vehicles`
- `/v1/server/bans`

Write endpoint:
- `POST /v1/server/command`

## 8.1 Rate-limit strategy
- Keep per-route bucket state in Redis + Postgres fallback.
- Before each call, verify `remaining` and `reset_at`.
- On 429, obey `retry_after` exactly and back off route bucket.
- Command endpoint gets dedicated queue with stricter throttle.

## 9. UI page map

Public pages:
- `/` Home
- `/features`
- `/pricing`
- `/docs`
- `/login`
- `/terms`
- `/privacy`
- `/contact`

App pages:
- `/app` Overview dashboard
- `/app/onboarding`
- `/app/moderation`
- `/app/activity`
- `/app/infractions`
- `/app/sessions`
- `/app/departments`
- `/app/alerts`
- `/app/team`
- `/app/integrations`
- `/app/settings`

## 10. Onboarding flow

1. Sign in with Discord.
2. Create workspace name + slug.
3. Invite members (Discord ID based).
4. Connect ER:LC server key.
5. Validate key and pull first sync.
6. Create departments.
7. Configure roles/department permissions.
8. Choose retention (30 or 90).
9. Configure Discord webhooks.
10. Enter dashboard.

## 11. Security checklist

- Encrypt all secrets at rest (Discord refresh tokens, ER:LC keys, webhook URLs).
- HttpOnly secure session cookies.
- CSRF protection on state-changing endpoints.
- Strict OAuth state and callback validation.
- Input validation on all API routes.
- Audit log every privileged action.
- Command allowlist/denylist before sending PRC commands.
- Per-user and per-workspace abuse throttling.

## 12. Launch checklist

- Discord OAuth flow works in production with custom domain (`https://sentinelerlc.xyz`).
- PRC sync stable for 72h with no unhandled rate-limit failures.
- Role-based permissions validated by test matrix.
- Retention jobs deleting expired records correctly.
- Webhook delivery retry logic and dead-letter handling.
- Terms/Privacy pages published with placeholder legal copy sections.

## 13. Delivery plan (sprints)

### Sprint 1
- Repository bootstrap, Next.js app skeleton, design system foundation.
- Auth module (Discord), session handling, user/account persistence.
- Workspace/member tables and role scaffolding.

### Sprint 2
- ER:LC server connect flow + encryption + sync worker skeleton.
- Rate-limit manager and endpoint polling for status/players/queue.
- Realtime stream plumbing (Redis pub/sub -> SSE).

### Sprint 3
- Moderation Panel and Activity Panel UI + APIs.
- Audit logging + command queue with guardrails.
- Departments CRUD + permissions binding.

### Sprint 4
- Infractions module end to end.
- Sessions create/monitor/metrics module.
- Alerts center + Discord webhook configuration and delivery.

### Sprint 5
- Onboarding wizard and UX polish.
- Public pages, docs stub, legal placeholders.
- QA hardening, performance pass, release candidate.

## 14. Environment variables (initial)

- `NEXT_PUBLIC_APP_URL`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DATABASE_URL`
- `REDIS_URL`
- `APP_ENCRYPTION_KEY`
- `SESSION_SECRET`
- `PRC_GLOBAL_API_KEY` (optional)

## 15. Future-ready extensions

- Add providers by inserting new rows in `auth_accounts` and enabling provider config.
- Add plan tiers beyond Solo/Team with a `workspace_plan` table later.
- Expose tenant-level API tokens for bots or external dashboards.
