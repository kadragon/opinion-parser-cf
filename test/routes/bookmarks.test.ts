import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/db/repository", () => ({
	getBookmarks: vi.fn().mockResolvedValue([]),
	toggleBookmark: vi.fn().mockResolvedValue({ bookmarked: true }),
}));

import { Hono } from "hono";
import { getBookmarks, toggleBookmark } from "../../src/db/repository";
import bookmarks from "../../src/routes/bookmarks";
import type { Env } from "../../src/types";

function buildApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/api/bookmarks", bookmarks);
	return app;
}

describe("GET /api/bookmarks", () => {
	it("reads clientToken from X-Client-Token header", async () => {
		const app = buildApp();
		const res = await app.request(
			"/api/bookmarks",
			{ headers: { "X-Client-Token": "test-token" } },
			{ DB: {} as D1Database },
		);

		expect(res.status).toBe(200);
		expect(getBookmarks).toHaveBeenCalledWith(expect.anything(), "test-token");
	});

	it("returns 400 without X-Client-Token header", async () => {
		const app = buildApp();
		const res = await app.request("/api/bookmarks", {}, { DB: {} as D1Database });

		expect(res.status).toBe(400);
	});
});

describe("POST /api/bookmarks", () => {
	it("reads clientToken from X-Client-Token header instead of body", async () => {
		const app = buildApp();
		const res = await app.request(
			"/api/bookmarks",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Client-Token": "header-token",
				},
				body: JSON.stringify({ articleId: 42 }),
			},
			{ DB: {} as D1Database },
		);

		expect(res.status).toBe(200);
		expect(toggleBookmark).toHaveBeenCalledWith(expect.anything(), 42, "header-token");
	});

	it("returns 400 without X-Client-Token header", async () => {
		const app = buildApp();
		const res = await app.request(
			"/api/bookmarks",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ articleId: 42 }),
			},
			{ DB: {} as D1Database },
		);

		expect(res.status).toBe(400);
	});
});
