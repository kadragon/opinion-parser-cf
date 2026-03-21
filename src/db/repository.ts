import type { ScrapedArticle } from "../scrapers/types";
import type { Article, ArticleWithBookmark, PaginatedResponse } from "../types";

export async function insertArticles(db: D1Database, articles: ScrapedArticle[]): Promise<number> {
	if (articles.length === 0) {
		return 0;
	}

	const statement = db.prepare(
		`INSERT OR IGNORE INTO articles (newspaper, title, url, summary, published_at, image_url)
		 VALUES (?, ?, ?, ?, ?, ?)`,
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

	const conditions: string[] = [];
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

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
			 ORDER BY b.created_at DESC`,
		)
		.bind(clientToken)
		.all<ArticleWithBookmark>();

	return result.results.map((r) => ({ ...r, bookmarked: true }));
}

export async function getAllArticlesForFeed(db: D1Database, limit = 50): Promise<Article[]> {
	const result = await db
		.prepare("SELECT * FROM articles ORDER BY published_at DESC LIMIT ?")
		.bind(limit)
		.all<Article>();

	return result.results;
}
