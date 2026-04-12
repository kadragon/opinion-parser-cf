# Conventions

## Naming

| Element | Pattern | Example |
|---------|---------|---------|
| Files (Workers) | `camelCase.ts` | `repository.ts`, `handler.ts` |
| Files (Frontend) | `PascalCase.tsx` for components, `camelCase.ts` for utils | `ArticleCard.tsx`, `useArticles.ts` |
| Functions | `camelCase` | `insertArticles`, `fetchWithRetry` |
| Types/Interfaces | `PascalCase` | `ScrapedArticle`, `GetArticlesParams` |
| D1 tables/columns | `snake_case` | `articles`, `published_at` |
| Env bindings (wrangler) | `SCREAMING_SNAKE_CASE` | `DB`, `SCRAPE_KEY`, `ALLOWED_ORIGIN` |
| Migration files | `NNNN_description.sql` | `0003_add_content_column.sql` |
| Test files | Mirror `src/` path, `.test.ts` suffix | `test/scrapers/hani.test.ts` |

## Date/Time (Critical)

All dates in this system are KST (+09:00). This is a hard requirement — D1 stores KST, the API returns KST.

**Always use:**
```ts
import { toKstIso, parseDate } from "../scrapers/base";

// Current time in KST
const now = toKstIso(new Date());

// Parse an arbitrary date string → KST
const kst = parseDate("2026-03-14 09:00");
```

**Never use:**
```ts
new Date().toISOString()    // Returns UTC — wrong timezone
new Date().toLocaleString() // Locale-dependent — unpredictable
```

## D1 Queries

All SQL is in `src/db/repository.ts` — see Architecture docs for why.

**Correct (parameterized):**
```ts
db.prepare("SELECT * FROM articles WHERE newspaper = ?").bind(newspaper).first()
```

**Wrong (string interpolation — never do this):**
```ts
db.prepare(`SELECT * FROM articles WHERE newspaper = '${newspaper}'`)  // SQL injection
```

## Error Handling

- Routes return Hono `c.json()` responses — never throw unhandled errors to the client
- Scrapers use `fetchWithRetry` (2 retries, exponential backoff) — let it throw on final failure; `cron/handler.ts` catches and logs
- Parser functions return `ScrapedArticle[]` or empty array on parse failure — never throw from a parser
- Never silently swallow errors: log or propagate

## Cloudflare Workers Specifics

- **No `Buffer`** — use `TextEncoder` / `TextDecoder`
- **No `setTimeout` for delays** — use `await new Promise(r => setTimeout(r, ms))` only in Workers (available via CF runtime, not Node)
- **`ctx.waitUntil()`** — for background work after response is sent (used in cron handler)
- **Environment bindings** are on `env` object, not `process.env`

## Frontend API Calls

Frontend calls the Workers via `fetch('/api/...')`. The `X-Client-Token` header is sent on all requests. No hardcoded base URL — relative paths only.

## Commit Format

```
[TYPE] description
```

Types: `FEAT` · `FIX` · `REFACTOR` · `DOCS` · `CONSTRAINT` · `HARNESS` · `PLAN` · `OPS`

One logical change per commit. All checks green before committing.

## Adding a Newspaper

Checklist for adding a new newspaper scraper/parser pair:
1. Create `src/scrapers/{paper}.ts` implementing `scrape(url): Promise<string>`
2. Create `src/parsers/{paper}.ts` implementing `parse(html: string): ScrapedArticle[]`
3. Register in `src/scrapers/index.ts` and `src/parsers/index.ts`
4. Add to `src/cron/handler.ts` scrape targets
5. Add tests in `test/scrapers/{paper}.test.ts`
