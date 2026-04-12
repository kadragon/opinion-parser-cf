# Tasks

## Review Backlog

### PR #20 — article removed_at tracking (2026-04-12)

- [ ] [harness] Deploy script does not apply D1 migrations before `wrangler deploy` — on environments where migration 0003 hasn't run, queries with `removed_at` will fail with "no such column". Consider adding `wrangler d1 migrations apply` step to the deploy script or documenting manual migration requirement in `docs/runbook.md`. (source: Codex) — `package.json`
