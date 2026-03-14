import { Hono } from "hono";
import { handleCron } from "../cron/handler";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.post("/", async (c) => {
	if (!c.env.SCRAPE_KEY) {
		return c.json({ error: "SCRAPE_KEY not configured" }, 500);
	}

	const key = c.req.header("X-Scrape-Key");
	if (key !== c.env.SCRAPE_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { results, totalInserted } = await handleCron(c.env.DB);
	return c.json({ results, totalInserted });
});

export default app;
