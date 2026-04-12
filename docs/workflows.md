# Workflows

Six workflows. Pick one primary per cycle. Minor permitted side-effects are listed at the bottom.

## `plan` — Spec Generation

For non-trivial features (new newspaper, new API endpoint, schema change).

1. Write `docs/design/{feature}.md`: user stories, tech design, phased feature list. No implementation details yet.
2. Review with user. Don't proceed until approved.
3. Generate `backlog.md` items from approved spec with concrete `Done-when` criteria.

Skip for trivial changes (bug fix, config tweak).

## `code` — Implementation

Delegation checkpoints are **named steps** — not optional references.

**Step 1: Scope check (delegation gate)**
Before touching any file, check objective delegation triggers from `docs/delegation.md`:
- First edit in this directory this session? → Explore agent (sonnet), blocking.
- Change touches ≥3 directories? → Architecture analysis agent (opus), blocking.
- If no trigger matches, proceed.

**Step 2: Sprint Contract**
Define "done" before writing code. For this solo project, write it inline:
```
Done-when:
- [ ] {specific testable criterion}
- [ ] Tests pass
- [ ] typecheck passes
- [ ] biome lint passes
```

**Step 3: Implement**
For ≤2 files: orchestrator implements directly.
For ≥3 files: delegate to Implementation agent with spec + conventions reference.

CF Workers invariants to check after every edit:
- No Node.js/DOM APIs introduced
- Dates use `toKstIso()` not `.toISOString()`
- Any new DB queries go through `src/db/repository.ts`

**Step 4: Post-implementation QA (always delegate)**
Delegate to code-reviewer agent after every commit. Pass: list of modified files + `docs/conventions.md`. Generator-Evaluator separation — the implementer does not self-evaluate.

**Step 5: Feature-complete evaluation**
When backlog items are checked off, delegate to product evaluator with `docs/eval-criteria.md` and done-when criteria.

## `draft` — Documentation

Write or update `docs/`. Ground every claim in current code. Never modify production code. If doc reveals missing constraint, add to `tasks.md`.

## `constrain` — Architectural Enforcement

1. Write structural test or lint rule first.
2. Run it.
3. If current code violates → add remediation to `backlog.md`, don't fix inline.
4. Update `docs/architecture.md`.

## `sweep` — Garbage Collection

Run between features or on schedule.

- Run: `grep -rn "toISOString()" src/ --include="*.ts"` (KST compliance check)
- Run: `grep -rn "\.prepare(" src/ --include="*.ts" | grep -v "src/db/"` (DB boundary check)
- Check `plan.md` and `docs/` for stale items
- List findings in `tasks.md` tagged `[doc]`, `[constraint]`, `[debt]`, or `[harness]`
- Fix trivials inline; leave complex items

## `explore` — Research

State question → research/prototype → report options and tradeoffs → **do not commit**. Flows into `plan` or `code` if approved.

---

## Context Anxiety

If context fills mid-task:
1. Write `handoff-{feature}.md` NOW (with current state, remaining work, blockers)
2. Reset context
3. Resume from handoff file

Prefer context reset over compaction. Write handoff at the **start** of multi-session work, not when already degraded.

---

## Permitted Side-Effects

| Primary | Permitted side-effect |
|---------|-----------------------|
| `code` | Add `[doc]` or `[constraint]` item to `tasks.md` |
| `code` | Update relevant `docs/` after implementation |
| `draft` | Add `backlog.md` item when doc reveals missing behavior |
| `sweep` | Fix trivial `[doc]` items inline |

**Not permitted:** Writing production code during `draft` or `sweep`.
