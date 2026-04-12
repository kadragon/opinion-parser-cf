# Runbook

## Prerequisites

- Bun 1.x (`bun --version`)
- Wrangler 4 (installed via devDependencies — use `bun run wrangler`)
- Cloudflare account with D1 database provisioned (for production)

## Setup

```bash
git clone <repo>
cd opinion-parser-cf
bun install
```

No `.env` needed for local development — Wrangler uses local D1 and the bindings in `wrangler.toml`.

## Build

| Command | Purpose |
|---------|---------|
| `bun run build:frontend` | Build React SPA → `dist/frontend/` |
| `bun run deploy` | Build frontend + deploy Workers to Cloudflare |

## Development

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start local Workers dev server (includes frontend) |
| `bun run dev:frontend` | Start Vite dev server for frontend only (hot reload) |
| `bun run predev` | Build frontend before dev (runs automatically before `dev`) |

Local dev server runs at `http://localhost:8787`.

## Test

| Command | Purpose |
|---------|---------|
| `bun run test` | Run full test suite (Vitest, CF Workers pool) |
| `bun run test:watch` | Watch mode |
| `bun test test/scrapers/hani.test.ts` | Run a single test file |

Tests run in `@cloudflare/vitest-pool-workers` — same V8 isolate as production. No Node.js environment differences.

## Lint & Type Check

| Command | Purpose |
|---------|---------|
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint with auto-fix |
| `bun run format` | Biome format |
| `bun run typecheck` | TypeScript type check (Workers) |
| `bun run typecheck:frontend` | TypeScript type check (frontend) |

Pre-commit hook (lefthook) runs `biome check --write` and `tsc --noEmit` automatically.

## Database (D1)

| Command | Purpose |
|---------|---------|
| `bun run wrangler d1 migrations apply opinion-parser-db --local` | Apply migrations locally |
| `bun run wrangler d1 migrations apply opinion-parser-db` | Apply migrations to production |
| `bun run wrangler d1 execute opinion-parser-db --local --command="SELECT * FROM articles LIMIT 5"` | Run query locally |

Migration files live in `migrations/`. Never edit existing migration files — add new ones.

## Deploy

```bash
bun run deploy
```

This runs `build:frontend` then `wrangler deploy`. Deploys to the `opinion-parser` Worker with smart placement.

Production cron runs hourly: `0 * * * *` (configured in `wrangler.toml`).

## Common Failures

### TypeScript: "Cannot find name 'Buffer'"

**Cause:** `Buffer` is a Node.js API, not available in CF Workers runtime.
**Fix:** Use `TextEncoder` / `TextDecoder` instead.

### Wrangler: "D1_ERROR: no such table"

**Cause:** Migrations haven't been applied to the local D1.
**Fix:** `bun run wrangler d1 migrations apply opinion-parser-db --local`

### Test: "Cannot find module" for CF types

**Cause:** `@cloudflare/vitest-pool-workers` requires specific vitest config.
**Fix:** Check `vitest.config.ts` — pool must be `@cloudflare/vitest-pool-workers`.

### Scraper returns 403/blocking response

**Cause:** The newspaper site is blocking the User-Agent or rate-limiting.
**Fix:** Check `DEFAULT_HEADERS` in `src/scrapers/base.ts`. Retry logic is built into `fetchWithRetry`.

### Biome pre-commit hook fails

**Cause:** Biome found lint errors or formatting issues.
**Fix:** Run `bun run lint:fix` and `bun run format`, then re-stage.

## Environment Variables (CF Bindings)

| Binding | Required | Description |
|---------|----------|-------------|
| `DB` | Yes | D1 database — configured in `wrangler.toml` |
| `SCRAPE_KEY` | No | API key to protect the `/api/scrape` endpoint |
| `ALLOWED_ORIGIN` | No | CORS allowed origin (defaults to permissive if unset) |

Bindings are set in Cloudflare Dashboard → Workers → Settings → Variables. Never commit secrets to `wrangler.toml`.
