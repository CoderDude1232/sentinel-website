# Sentinel Website

Sentinel is an ER:LC operations platform with modules for moderation, activity, infractions, sessions, departments, and alerts.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Planned backend services: PostgreSQL, Redis, worker ingestion service

## Setup

1. Create a `.env` file in the project root.
2. Fill in Discord OAuth, bot, and infrastructure values:
   - `NEXT_PUBLIC_APP_URL`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI`
   - `DISCORD_BOT_TOKEN` (for bot delivery)
   - `DISCORD_BOT_CLIENT_ID` (optional, defaults to `DISCORD_CLIENT_ID`)
   - `NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED` (optional, production default is enabled)
   - `DATABASE_URL`
   - `APP_ENCRYPTION_KEY`
   - `SESSION_SECRET`
   - Production URL examples:
     - `NEXT_PUBLIC_APP_URL=https://sentinelerlc.xyz`
     - `DISCORD_REDIRECT_URI=https://sentinelerlc.xyz/api/auth/discord/callback`
3. Install dependencies:

```bash
npm install
```

4. Run dev server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Specification

Core product and architecture plan is documented in:

- `docs/SENTINEL_V1_TECH_SPEC.md`

## Deployment Note

This repository may receive no-op commits to force a fresh deployment rollout when needed.
