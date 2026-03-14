import { Hono } from "hono";
import { getBookmarks, toggleBookmark } from "../db/repository";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const clientToken = c.req.header("X-Client-Token");

	if (!clientToken) {
		return c.json({ error: "X-Client-Token header is required" }, 400);
	}

	const bookmarks = await getBookmarks(c.env.DB, clientToken);
	return c.json(bookmarks);
});

app.post("/", async (c) => {
	const clientToken = c.req.header("X-Client-Token");

	if (!clientToken) {
		return c.json({ error: "X-Client-Token header is required" }, 400);
	}

	let body: { articleId?: number };
	try {
		body = await c.req.json<{ articleId?: number }>();
	} catch {
		return c.json({ error: "Invalid JSON body" }, 400);
	}

	if (!body.articleId) {
		return c.json({ error: "articleId is required" }, 400);
	}

	const result = await toggleBookmark(c.env.DB, body.articleId, clientToken);
	return c.json(result);
});

export default app;
