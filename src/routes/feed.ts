import { Hono } from "hono";
import { getAllArticlesForFeed } from "../db/repository";
import type { Article, Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const articles = await getAllArticlesForFeed(c.env.DB, 50);
	const xml = buildRss(articles);
	return c.body(xml, 200, { "Content-Type": "application/rss+xml; charset=utf-8" });
});

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function buildRss(articles: Article[]): string {
	const items = articles
		.map((article) => {
			const pubDate = new Date(article.published_at).toUTCString();
			return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.url)}</link>
      <description>${escapeXml(article.summary ?? "")}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Opinion Parser</title>
    <description>Latest opinion articles from Korean newspapers</description>
    <language>ko</language>
${items}
  </channel>
</rss>`;
}

export default app;
