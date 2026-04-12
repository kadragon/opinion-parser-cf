# Evaluation Criteria

The agent that implements a feature must NOT evaluate its own work. Delegate evaluation to a separate agent with this doc as context.

## Criteria

### 1. Correctness (40%)

Do the features work end-to-end as specified?

| Score | Description |
|-------|-------------|
| 5 | All done-when criteria pass. Edge cases handled. |
| 4 | All primary criteria pass. 1-2 minor edge cases unhandled. |
| 3 | Core functionality works. Notable edge case failures. |
| 2 | Core functionality partially works. |
| 1 | Feature does not function. |

**How to test:** Exercise each done-when criterion. For scrapers: parse a real or fixture HTML snapshot and verify output shape. For API: call the endpoint with expected inputs, verify response structure.

### 2. CF Workers Compatibility (25%)

Does the code run in the CF Workers V8 isolate without Node.js/DOM dependencies?

| Score | Description |
|-------|-------------|
| 5 | `bun run typecheck` passes. No Node APIs used. All dates KST. DB access via repository only. |
| 4 | typecheck passes. One minor convention deviation (not a runtime error). |
| 3 | typecheck passes. Convention deviations present but not runtime-breaking. |
| 2 | typecheck fails OR uses a Node API that happens to exist in this runtime version. |
| 1 | Uses Node/DOM APIs that cause runtime errors. |

**How to test:** Run `bun run typecheck`. Run the sweep checks in `docs/workflows.md` → `sweep` section.

### 3. Data Integrity (20%)

Are D1 writes correct and idempotent?

| Score | Description |
|-------|-------------|
| 5 | `INSERT OR IGNORE` prevents duplicates. Timestamps are KST. Schema matches types. |
| 4 | Idempotent. Minor timestamp or type mismatch. |
| 3 | Functionally correct but duplicates possible under concurrent runs. |
| 2 | Data shape mismatch between code and schema. |
| 1 | Data loss or corruption possible. |

**How to test:** For new scrapers: run insert twice with same data, verify count doesn't double. Check `published_at` values are `+09:00` format.

### 4. Security (15%)

Are the golden principles around input handling respected?

| Score | Description |
|-------|-------------|
| 5 | All queries parameterized. HTML sanitization handles nested tags. No secrets in code. |
| 4 | Queries parameterized. Minor sanitization gap not exploitable. |
| 3 | Queries parameterized. Sanitization acceptable for current use. |
| 2 | SQL uses string interpolation OR sanitization regression. |
| 1 | SQL injection vulnerability introduced. |

**How to test:** Scan for template literals in SQL. Test `stripHtmlTags` with `<sc<script>ript>` input.

## Sprint Contract Template

Before each `code` cycle, write done-when criteria:

```markdown
### Sprint Contract: {Feature Name}

Done-when:
- [ ] {Specific, testable criterion}
- [ ] `bun run test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] No Node.js/DOM API introduced (sweep check green)
```

## Pass Threshold

- All criteria ≥ 3 (no single dimension broken)
- Weighted average ≥ 3.5

Below threshold → findings go to `backlog.md` → fix → re-evaluate.

## Evaluator Protocol

1. Read done-when criteria from `backlog.md` or sprint contract
2. Read `docs/eval-criteria.md` (this file)
3. Exercise the feature — run tests, call endpoints, inspect D1 writes
4. Grade each criterion **independently** with specific evidence
5. Score follows from evidence, not impression
6. Below threshold → create specific `backlog.md` items for each finding

**Anti-pattern to avoid:** "The parser mostly works and this is a minor issue, so I'll give it a 4." If a criterion fails, it fails. Grade what you observe.
