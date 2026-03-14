import { Hono } from "hono";
import { getArticles } from "../db/repository";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
	const newspaper = c.req.query("newspaper");
	const date = c.req.query("date");
	const q = c.req.query("q");
	const page = Number(c.req.query("page") ?? "1");
	const pageSize = Number(c.req.query("pageSize") ?? "20");
	const clientToken = c.req.query("clientToken");

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
