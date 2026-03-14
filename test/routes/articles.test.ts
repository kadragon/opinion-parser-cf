import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/db/repository", () => ({
	getArticles: vi.fn().mockResolvedValue({
		data: [],
		total: 0,
		page: 1,
		pageSize: 20,
		totalPages: 0,
	}),
}));

import { Hono } from "hono";
import { getArticles } from "../../src/db/repository";
import articles from "../../src/routes/articles";
import type { Env } from "../../src/types";

function buildApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/api/articles", articles);
	return app;
}

describe("GET /api/articles", () => {
	it("reads clientToken from X-Client-Token header", async () => {
		const app = buildApp();
		await app.request(
			"/api/articles",
			{ headers: { "X-Client-Token": "test-token-123" } },
			{ DB: {} as D1Database },
		);

		expect(getArticles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ clientToken: "test-token-123" }),
		);
	});

	it("does not read clientToken from query parameter", async () => {
		const app = buildApp();
		await app.request("/api/articles?clientToken=query-token", {}, { DB: {} as D1Database });

		expect(getArticles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ clientToken: undefined }),
		);
	});
});
