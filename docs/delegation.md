# Delegation

Orchestrator plans, routes, and verifies. Sub-agents do the heavy lifting.

## Mandatory Gates (blocking)

Triggers are objective and measurable — no self-assessment required.

| Trigger (objective) | Delegate to | Model | Context to pass |
|---------------------|-------------|-------|-----------------|
| First edit in a directory this session | Explore agent | sonnet | Directory path, `docs/architecture.md` |
| Change touches ≥3 directories | Architecture analysis | opus | Changed paths, `docs/architecture.md` |
| Adding a new newspaper (scraper + parser) | Implementation agent | sonnet | Existing scraper as reference, `docs/conventions.md` |
| Any migration file change | Analysis agent | sonnet | Migration file, current schema |
| After implementation (always) | Code reviewer | sonnet | Modified files list, `docs/conventions.md` |
| Feature complete | Product evaluator | opus | Done-when criteria, `docs/eval-criteria.md` |
| Same failure persists x2 | Deep investigation | opus | Error context, what was tried |

## Background Gates (non-blocking)

| Trigger | Delegate to | Model |
|---------|-------------|-------|
| Every commit | Code reviewer | sonnet |
| Periodic (between features) | Sweep | haiku |

## Escalation

| Trigger | Action |
|---------|--------|
| Same failure x2 | Pause — delegate deep investigation to opus agent |
| Design decision with tradeoffs | Report both options to user, do not choose |
| CF Workers API uncertainty | Check `@cloudflare/workers-types` + verify with `bun run typecheck` before proceeding |

## Context Manifests

### Explore Agent (sonnet)

**Purpose:** Map a directory or module before the orchestrator edits it.

**Required context:**
- Target directory path
- `docs/architecture.md` — layer rules and dependencies
- Question: "What does this module do, what are its dependencies, and what would break if I changed X?"

**Expected output:** 1-2 paragraph summary of module purpose, key dependencies, and risk areas.

### Architecture Analysis Agent (opus)

**Purpose:** Analyze cross-cutting changes before implementation.

**Required context:**
- List of directories/files to be changed
- `docs/architecture.md`
- `docs/conventions.md`
- Proposed change description

**Expected output:** Impact analysis — what layers are affected, what invariants are at risk, recommended approach.

### Code Reviewer (sonnet)

**Purpose:** Catch bugs, convention violations, and security issues after implementation.

**Required context:**
- List of modified files (pass file paths)
- `docs/conventions.md`
- `docs/architecture.md` (golden principles section)

**Expected output:** Findings list with severity (blocking / warning). Blocking issues must be fixed before merge.

### Product Evaluator (opus)

**Purpose:** Grade completed feature against done-when criteria.

**Required context:**
- Done-when criteria from `backlog.md`
- `docs/eval-criteria.md`
- Modified files list

**Expected output:** Score per criterion with specific evidence. Below threshold → findings become new `backlog.md` items.

## Applying Sub-Agent Output

- **Structural fix** (typo, wrong import) → apply in current cycle
- **Behavioral change** → add to `backlog.md`, never apply directly
- **Contradicts design doc** → report both options to user, do not choose
