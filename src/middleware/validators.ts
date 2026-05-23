import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";

export function requireClientToken(): MiddlewareHandler<{ Bindings: Env }> {
	return async (c, next) => {
		const token = c.req.header("X-Client-Token")?.trim();
		if (!token) {
			return c.json({ error: "X-Client-Token header is required" }, 400);
		}
		await next();
	};
}
