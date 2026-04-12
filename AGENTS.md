# Opinion Parser Agent Rules

A Cloudflare Workers app (Hono + D1) that scrapes Korean newspaper opinion columns hourly, stores them in SQLite, and serves them via a REST API to a React 19 SPA.

## Docs Index (read on demand)

| File | When to read |
|------|--------------|
| `docs/architecture.md` | Before adding modules, routes, scrapers, or changing layer boundaries |
| `docs/conventions.md` | Before writing new code — naming, dates, queries, error handling |
| `docs/workflows.md` | When starting any implementation cycle |
| `docs/delegation.md` | Before delegating to sub-agents |
| `docs/eval-criteria.md` | When evaluating completed features |
| `docs/runbook.md` | For build, test, deploy commands and troubleshooting |

## Golden Principles

Invariants enforced mechanically. Violations block commits.

1. **No Node.js/DOM APIs in Workers code** — The CF Workers runtime has no `document`, `window`, `Buffer`, `fs`, `process`, `require`, or Node `crypto`. Use only Web Standard APIs (`fetch`, `URL`, `TextDecoder`, `crypto.subtle`). Verify with `bun run typecheck` — the `@cloudflare/workers-types` types will surface incompatible APIs.

2. **All D1 queries through `src/db/repository.ts`** — No raw D1 calls in routes, parsers, scrapers, or cron. Routes call repository functions; cron calls repository functions. The repository is the sole DB layer. Verify: `grep -r "\.prepare(" src/ --include="*.ts" | grep -v "src/db/"`.

3. **KST timestamps everywhere** — All date strings stored in D1 and returned by the API use KST ISO 8601 format (`2026-03-14T09:00:00+09:00`). Use `toKstIso()` or `parseDate()` from `src/scrapers/base.ts`. Never call `new Date().toISOString()` directly — it returns UTC. Verify: `grep -r "toISOString()" src/ --include="*.ts"`.

4. **Parameterized D1 queries only** — All SQL uses `?` placeholders bound via `.bind(...)`. No string interpolation or concatenation in SQL. Verify: scan `src/db/repository.ts` for template literals containing SQL keywords.

5. **HTML sanitization must strip iteratively** — `stripHtmlTags` (base.ts:77) has a known incomplete-sanitization vulnerability. Any fix must use iterative stripping (loop until stable) or a whitelist approach. Do not add new callers of the current single-pass implementation for user-facing output.

## Delegation (Hard Stop)

Read `docs/delegation.md` for full routing table. Summary of mandatory gates:

| Trigger (objective) | Gate |
|---------------------|------|
| First edit in a directory this session | Explore agent (sonnet) — blocking |
| Change touches ≥3 directories | Architecture analysis (opus) — blocking |
| After any implementation | QA/code-reviewer (sonnet) — background |
| Same failure persists x2 | Deep investigation (opus) — blocking |

## Working with Existing Code

- **Adding a newspaper scraper:** implement `ScraperBase` interface in `src/scrapers/`, add matching parser in `src/parsers/`, register in `src/cron/handler.ts`. One scraper = one parser, always paired.
- **DB schema changes:** create a new migration file in `migrations/` (`bun run wrangler d1 migrations apply opinion-parser-db --local`). Never edit existing migration files.
- **Wrangler config** (`wrangler.toml`) and lock files (`bun.lock`) are protected — the PreToolUse hook blocks edits.
- **Frontend** lives in `src/frontend/` and is built separately with `bun run build:frontend`. It is a static SPA; all API calls use `fetch` to `/api/`.
- **Tests** live in `test/` mirroring `src/` structure. Use `@cloudflare/vitest-pool-workers` for Workers environment tests.

## Context Management

On multi-session work: write `handoff-{feature}.md` at the **start** (when context is fresh), not when degraded. Delete when feature is complete. Prefer context reset over compaction when context fills on large tasks.

## Language Policy

- Code, commits, docs: English
- User communication: Korean
