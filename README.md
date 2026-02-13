# Sentinel Website

Sentinel is an ER:LC operations platform with modules for moderation, activity, infractions, sessions, departments, and alerts.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Planned backend services: PostgreSQL, Redis, worker ingestion service

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in Discord OAuth and infrastructure values.
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
