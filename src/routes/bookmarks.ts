import { Hono } from "hono";
import { getBookmarks, toggleBookmark } from "../db/repository";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const clientToken = c.req.query("clientToken");

	if (!clientToken) {
		return c.json({ error: "clientToken is required" }, 400);
	}

	const bookmarks = await getBookmarks(c.env.DB, clientToken);
	return c.json(bookmarks);
});

app.post("/", async (c) => {
	const body = await c.req.json<{ articleId?: number; clientToken?: string }>();

	if (!body.articleId || !body.clientToken) {
		return c.json({ error: "articleId and clientToken are required" }, 400);
	}

	const result = await toggleBookmark(c.env.DB, body.articleId, body.clientToken);
	return c.json(result);
});

export default app;
