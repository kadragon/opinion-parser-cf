CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  newspaper TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  published_at TEXT NOT NULL,
  scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
  image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_newspaper ON articles(newspaper);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  client_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(article_id, client_token)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_client_token ON bookmarks(client_token);
