# Tasks

## Review Backlog

### PR #20 — article removed_at tracking (2026-04-12)

- [x] [harness] Deploy script does not apply D1 migrations before `wrangler deploy` — fixed: `package.json` deploy script now runs `wrangler d1 migrations apply opinion-parser-db` before `wrangler deploy`. (source: Codex)

### PR #34 — Fix 조선일보 body from Arc Fusion.globalContent (2026-06-14)

- [ ] [debt] `extractBalancedJson` (shared.ts:4): `html.slice(startIndex)` creates unnecessary string copy; iterate directly on original string from startIndex to reduce heap allocation in CF Workers (source: agy) — src/parsers/shared.ts:4
- [ ] [debt] `extractFusionGlobalContent` (shared.ts:66): if all content_elements are non-text types (Arc schema drift), result is empty with no log; add diagnostic when elements.length > 0 but result is empty (source: pr-review-toolkit:review-pr) — src/parsers/shared.ts:66
- [ ] [constraint] Add unit tests for `extractBalancedJson` escape-handling (`\"` sequences), malformed/truncated Arc JSON fallback to __NEXT_DATA__, and Fusion.globalContent without content_elements (source: pr-review-toolkit:review-pr) — test/parsers/content-parsers.test.ts
- [ ] [debt] `.antigravitycli/b17c1ded-a3c2-4f5e-b281-70493fdc7193.json` machine-local absolute symlink committed to repo; add to .gitignore or replace with portable config (source: codex)
- [ ] [debt] `.agents/skills` symlink target (`../.claude/skills`) is not tracked; dangling on clean checkout; add `.gitkeep` or add to .gitignore (source: codex)
- [ ] [doc] `extractBalancedJson` (shared.ts:3): add JSDoc noting `startIndex` must point exactly at `{`; the caller's `-1` offset is load-bearing (source: pr-review-toolkit:review-pr) — src/parsers/shared.ts:3
- [ ] [debt] chosun.ts:24 Strategy 1 comment does not mention `type='text'` filter; chosun.ts:39 Strategy 3 label missing (source: pr-review-toolkit:review-pr)
