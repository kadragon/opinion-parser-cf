import { Hono } from "hono";
import { insertArticles } from "../db/repository";
import { getAllScrapers } from "../scrapers/index";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
	if (c.env.SCRAPE_KEY) {
		const key = c.req.header("X-Scrape-Key");
		if (key !== c.env.SCRAPE_KEY) {
			return c.json({ error: "Unauthorized" }, 401);
		}
	}

	const scrapers = getAllScrapers();
	const results: { newspaper: string; inserted: number; error?: string }[] = [];
	let totalInserted = 0;

	for (const scraper of scrapers) {
		try {
			const articles = await scraper.scrape();
			const inserted = await insertArticles(c.env.DB, articles);
			totalInserted += inserted;
			results.push({ newspaper: scraper.name, inserted });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			results.push({ newspaper: scraper.name, inserted: 0, error: message });
		}
	}

	return c.json({ results, totalInserted });
});

export default app;
