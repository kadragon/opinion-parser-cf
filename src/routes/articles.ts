import { Hono } from "hono";
import { getArticles } from "../db/repository";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const newspaper = c.req.query("newspaper");
	const date = c.req.query("date");
	const q = c.req.query("q");
	const rawPage = Number(c.req.query("page") ?? "1");
	const rawPageSize = Number(c.req.query("pageSize") ?? "20");

	if (Number.isNaN(rawPage) || Number.isNaN(rawPageSize)) {
		return c.json({ error: "page and pageSize must be valid numbers" }, 400);
	}

	const page = Math.max(1, Math.min(rawPage, 1000));
	const pageSize = Math.max(1, Math.min(rawPageSize, 100));
	const clientToken = c.req.header("X-Client-Token");

	const result = await getArticles(c.env.DB, {
		newspaper,
		date,
		q,
		page,
		pageSize,
		clientToken,
	});

	return c.json(result);
});

export default app;
