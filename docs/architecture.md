# Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.7 |
| Runtime | Cloudflare Workers (V8 isolate — no Node.js) |
| Framework | Hono 4.x |
| Database | Cloudflare D1 (SQLite, via `DB` binding) |
| Frontend | React 19 + Vite 8, served as static assets from `dist/frontend/` |
| Build | Wrangler 4 (Workers), Vite (frontend), Bun (package manager) |
| Lint/Format | Biome 2 |
| Test | Vitest 4 + @cloudflare/vitest-pool-workers |
| CI | GitHub Actions + lefthook (pre-commit) |

## Source Layout

```
src/
  index.ts            # Hono app + scheduled (cron) export
  types.ts            # Shared types: Env, Article, Bookmark, PaginatedResponse
  cron/
    handler.ts        # Hourly cron: scrape → parse → insert
  db/
    repository.ts     # SOLE D1 access layer — all SQL lives here
  middleware/
    cors.ts           # CORS middleware (reads ALLOWED_ORIGIN binding)
  parsers/            # One parser per newspaper — HTML → ScrapedArticle
    index.ts          # Registry: maps newspaper name → parser function
    types.ts          # ParsedArticle / ScrapedArticle types
    {paper}.ts        # chosun, donga, hani, joongang, khan
  routes/             # Hono route handlers — orchestrate, never query DB directly
    articles.ts
    article-content.ts
    bookmarks.ts
    feed.ts
    scrape.ts
  scrapers/           # One scraper per newspaper — fetches HTML from URL
    index.ts          # Registry: exports all scrapers
    base.ts           # Shared utilities: fetchWithRetry, parseDate, toKstIso, cleanText
    types.ts          # ScraperResult type
    {paper}.ts        # chosun, donga, hani, joongang, khan
  frontend/           # React SPA (built to dist/frontend/ via Vite)
    vite.config.ts
    main.tsx
    App.tsx
    components/, context/, hooks/, lib/, styles/

test/                 # Mirrors src/ structure
  cors.test.ts
  db/
  routes/
  scrapers/

migrations/           # D1 migration files (append-only)
  0001_initial.sql
  0002_article_content_cache.sql

dist/
  frontend/           # Built SPA (gitignored, served as CF Assets)
```

## Layer Rules

### Dependency Direction

```
routes/ → db/repository.ts → D1
cron/   → scrapers/ → base.ts
        → parsers/
        → db/repository.ts
```

Upper layers import lower layers. Lower layers never import upper layers.

**Hard boundaries:**
- `routes/` and `cron/` never call D1 directly — only through `db/repository.ts`
- `parsers/` are pure functions — no I/O, no DB, no fetch
- `scrapers/` only perform fetch — no DB writes
- `src/frontend/` is a completely separate build unit — no shared imports with Workers code

### CF Workers Runtime Constraint

This is NOT a Node.js environment. The following do NOT exist:
- `document`, `window`, `navigator` (no DOM)
- `Buffer`, `fs`, `path`, `stream`, `crypto` (Node built-ins)
- `require()`, `__dirname`, `__filename` (CommonJS)

Use only Web Standard APIs: `fetch`, `URL`, `URLSearchParams`, `TextDecoder`, `TextEncoder`, `crypto.subtle`, `Response`, `Request`, `Headers`.

Violation detection: `bun run typecheck` — `@cloudflare/workers-types` will flag incompatible APIs.

## Data Access

All D1 access is in `src/db/repository.ts`. Functions:

| Function | Purpose |
|----------|---------|
| `insertArticles(db, articles)` | Batch insert with `INSERT OR IGNORE` |
| `getArticles(db, params)` | Paginated article listing with optional bookmark join |
| `toggleBookmark(db, articleId, clientToken)` | Toggle bookmark state |
| `getBookmarks(db, clientToken)` | All bookmarks for a client |
| `getAllArticlesForFeed(db, limit)` | RSS feed generation |

All queries use `?` bound parameters — no string interpolation.

## Scraper → Parser Pipeline

```
cron/handler.ts
  → scraper.scrape(url)        # fetch HTML, return raw HTML string
  → parser.parse(html)         # extract ScrapedArticle[] from HTML
  → repository.insertArticles  # store in D1
```

Each newspaper has exactly one scraper (`src/scrapers/{paper}.ts`) and one parser (`src/parsers/{paper}.ts`). They are registered in `src/scrapers/index.ts` and `src/parsers/index.ts`.

## Key Abstractions

1. **`Env` (types.ts)** — CF Workers bindings: `DB: D1Database`, `SCRAPE_KEY?: string`, `ALLOWED_ORIGIN?: string`. Every route handler and cron handler receives this via Hono's type parameter `Hono<{ Bindings: Env }>`.

2. **`ScrapedArticle` (scrapers/types.ts)** — Output of the scraper+parser pipeline. Shape must match the `articles` D1 table schema.

3. **`toKstIso()` / `parseDate()` (scrapers/base.ts)** — Canonical date utilities. All timestamps in this system are KST (+09:00). Never store or return UTC dates.

4. **`clientToken`** — Anonymous client identity passed in `X-Client-Token` header. Used for bookmark scoping. Not an auth mechanism — it's a client correlation key.
