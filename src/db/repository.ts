import { toKstIso } from "../scrapers/base";
import type { ScrapedArticle } from "../scrapers/types";
import type { Article, ArticleWithBookmark, PaginatedResponse } from "../types";

export async function insertArticles(db: D1Database, articles: ScrapedArticle[]): Promise<number> {
	if (articles.length === 0) {
		return 0;
	}

	const statement = db.prepare(
		`INSERT INTO articles (newspaper, title, url, summary, published_at, image_url)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(url) DO UPDATE SET summary = excluded.summary WHERE articles.summary IS NULL AND excluded.summary IS NOT NULL`,
	);

	const batch = articles.map((article) =>
		statement.bind(
			article.newspaper,
			article.title,
			article.url,
			article.summary,
			article.published_at,
			article.image_url,
		),
	);

	const results = await db.batch(batch);
	return results.reduce((sum, r) => sum + (r.meta.changes ?? 0), 0);
}

export interface GetArticlesParams {
	newspaper?: string;
	date?: string;
	q?: string;
	page?: number;
	pageSize?: number;
	clientToken?: string;
}

export async function getArticles(
	db: D1Database,
	params: GetArticlesParams = {},
): Promise<PaginatedResponse<ArticleWithBookmark>> {
	const { newspaper, date, q, page = 1, pageSize = 20, clientToken } = params;

	const conditions: string[] = ["a.removed_at IS NULL"];
	const bindings: (string | number)[] = [];

	if (newspaper) {
		conditions.push("a.newspaper = ?");
		bindings.push(newspaper);
	}

	if (date) {
		conditions.push("date(a.published_at) = ?");
		bindings.push(date);
	}

	if (q) {
		conditions.push("a.title LIKE ?");
		bindings.push(`%${q}%`);
	}

	const whereClause = `WHERE ${conditions.join(" AND ")}`;

	const countResult = await db
		.prepare(`SELECT COUNT(*) as total FROM articles a ${whereClause}`)
		.bind(...bindings)
		.first<{ total: number }>();

	const total = countResult?.total ?? 0;
	const offset = (page - 1) * pageSize;

	let query: string;
	let queryBindings: (string | number)[];

	if (clientToken) {
		query = `
			SELECT a.*, CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END as bookmarked
			FROM articles a
			LEFT JOIN bookmarks b ON a.id = b.article_id AND b.client_token = ?
			${whereClause}
			ORDER BY a.published_at DESC
			LIMIT ? OFFSET ?
		`;
		queryBindings = [clientToken, ...bindings, pageSize, offset];
	} else {
		query = `
			SELECT a.*, 0 as bookmarked
			FROM articles a
			${whereClause}
			ORDER BY a.published_at DESC
			LIMIT ? OFFSET ?
		`;
		queryBindings = [...bindings, pageSize, offset];
	}

	const result = await db
		.prepare(query)
		.bind(...queryBindings)
		.all<ArticleWithBookmark>();

	return {
		data: result.results.map((r) => ({
			...r,
			bookmarked: Boolean(r.bookmarked),
		})),
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	};
}

export async function toggleBookmark(
	db: D1Database,
	articleId: number,
	clientToken: string,
): Promise<{ bookmarked: boolean }> {
	const existing = await db
		.prepare("SELECT id FROM bookmarks WHERE article_id = ? AND client_token = ?")
		.bind(articleId, clientToken)
		.first<{ id: number }>();

	if (existing) {
		await db.prepare("DELETE FROM bookmarks WHERE id = ?").bind(existing.id).run();
		return { bookmarked: false };
	}

	await db
		.prepare("INSERT INTO bookmarks (article_id, client_token) VALUES (?, ?)")
		.bind(articleId, clientToken)
		.run();
	return { bookmarked: true };
}

export async function getBookmarks(
	db: D1Database,
	clientToken: string,
): Promise<ArticleWithBookmark[]> {
	const result = await db
		.prepare(
			`SELECT a.*, 1 as bookmarked
			 FROM articles a
			 INNER JOIN bookmarks b ON a.id = b.article_id
			 WHERE b.client_token = ?
			   AND a.removed_at IS NULL
			 ORDER BY b.created_at DESC`,
		)
		.bind(clientToken)
		.all<ArticleWithBookmark>();

	return result.results.map((r) => ({ ...r, bookmarked: true }));
}

export async function getAllArticlesForFeed(db: D1Database, limit = 50): Promise<Article[]> {
	const result = await db
		.prepare("SELECT * FROM articles WHERE removed_at IS NULL ORDER BY published_at DESC LIMIT ?")
		.bind(limit)
		.all<Article>();

	return result.results;
}

/**
 * Marks articles as removed if they no longer appear in the scraper's active URL list.
 * Only checks articles published within the last `withinDays` days to avoid marking
 * articles that have simply aged off the listing page.
 * Also clears removed_at for articles that have reappeared in the active list.
 */
export async function markRemovedArticles(
	db: D1Database,
	newspaper: string,
	activeUrls: string[],
	withinDays = 1,
): Promise<{ removed: number; restored: number }> {
	if (activeUrls.length === 0) {
		return { removed: 0, restored: 0 };
	}

	const now = toKstIso(new Date());
	const cutoffDate = toKstIso(new Date(Date.now() - withinDays * 86_400_000));
	const placeholders = activeUrls.map(() => "?").join(", ");

	const removeResult = await db
		.prepare(
			`UPDATE articles
			 SET removed_at = ?
			 WHERE newspaper = ?
			   AND published_at >= ?
			   AND url NOT IN (${placeholders})
			   AND removed_at IS NULL`,
		)
		.bind(now, newspaper, cutoffDate, ...activeUrls)
		.run();

	const restoreResult = await db
		.prepare(
			`UPDATE articles
			 SET removed_at = NULL
			 WHERE newspaper = ?
			   AND url IN (${placeholders})
			   AND removed_at IS NOT NULL`,
		)
		.bind(newspaper, ...activeUrls)
		.run();

	return {
		removed: removeResult.meta.changes ?? 0,
		restored: restoreResult.meta.changes ?? 0,
	};
}

export async function reconcileArticles(
	db: D1Database,
	newspaper: string,
	articles: ScrapedArticle[],
): Promise<{ inserted: number; removed: number; restored: number }> {
	const inserted = await insertArticles(db, articles);
	const activeUrls = articles.map((a) => a.url);
	const { removed, restored } = await markRemovedArticles(db, newspaper, activeUrls);
	return { inserted, removed, restored };
}
