CREATE TABLE IF NOT EXISTS article_content_cache (
  url TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  published_at TEXT,
  body TEXT NOT NULL,
  newspaper TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);
