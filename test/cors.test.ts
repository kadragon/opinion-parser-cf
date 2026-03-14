import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createCorsMiddleware } from "../src/middleware/cors";
import type { Env } from "../src/types";

function buildApp(corsMiddleware: ReturnType<typeof createCorsMiddleware>) {
	const app = new Hono<{ Bindings: Env }>();
	app.use("*", corsMiddleware);
	app.get("/test", (c) => c.text("ok"));
	return app;
}

describe("CORS origin restriction", () => {
	it("allows any origin when ALLOWED_ORIGIN is not set", async () => {
		const app = buildApp(createCorsMiddleware());
		const res = await app.request(
			"/test",
			{ headers: { Origin: "https://random-site.com" } },
			{ DB: {} as D1Database },
		);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://random-site.com");
	});

	it("allows matching origin when ALLOWED_ORIGIN is set", async () => {
		const app = buildApp(createCorsMiddleware());
		const res = await app.request(
			"/test",
			{ headers: { Origin: "https://my-app.pages.dev" } },
			{ DB: {} as D1Database, ALLOWED_ORIGIN: "https://my-app.pages.dev" },
		);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://my-app.pages.dev");
	});

	it("rejects non-matching origin when ALLOWED_ORIGIN is set", async () => {
		const app = buildApp(createCorsMiddleware());
		const res = await app.request(
			"/test",
			{ headers: { Origin: "https://evil-site.com" } },
			{ DB: {} as D1Database, ALLOWED_ORIGIN: "https://my-app.pages.dev" },
		);
		const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
		expect(allowOrigin).not.toBe("https://evil-site.com");
	});
});
