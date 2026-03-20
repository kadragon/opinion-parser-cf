import { Hono } from "hono";
import { parseArticleContent } from "../parsers";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const url = c.req.query("url");

	if (!url) {
		return c.json({ error: "url 파라미터가 필요합니다." }, 400);
	}

	let parsed: URL;
	try {
		parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			throw new Error("Invalid protocol");
		}
	} catch {
		return c.json({ error: "유효하지 않은 URL입니다.", fallbackUrl: url }, 400);
	}

	// Check cache
	try {
		const cached = await c.env.DB.prepare(
			"SELECT title, published_at, body, newspaper FROM article_content_cache WHERE url = ?",
		)
			.bind(url)
			.first<{ title: string; published_at: string; body: string; newspaper: string }>();

		if (cached) {
			return c.json({
				title: cached.title,
				publishedAt: cached.published_at,
				body: JSON.parse(cached.body),
				newspaper: cached.newspaper,
			});
		}
	} catch (err) {
		console.error("Cache read failed:", err);
	}

	// Fetch and parse
	try {
		const result = await parseArticleContent(url);

		// Store in cache
		try {
			await c.env.DB.prepare(
				"INSERT OR REPLACE INTO article_content_cache (url, title, published_at, body, newspaper) VALUES (?, ?, ?, ?, ?)",
			)
				.bind(url, result.title, result.publishedAt, JSON.stringify(result.body), result.newspaper)
				.run();
		} catch (err) {
			console.error("Cache write failed:", err);
		}

		return c.json({
			title: result.title,
			publishedAt: result.publishedAt,
			body: result.body,
			newspaper: result.newspaper,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "본문을 가져올 수 없습니다.";
		return c.json({ error: message, fallbackUrl: url }, 502);
	}
});

export default app;
