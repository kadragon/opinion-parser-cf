import { cors } from "hono/cors";
import type { Env } from "../types";

export function createCorsMiddleware() {
	return cors({
		origin: (requestOrigin, c) => {
			const allowed = (c.env as Env).ALLOWED_ORIGIN;
			if (!allowed) return requestOrigin;
			return requestOrigin === allowed ? allowed : "";
		},
	});
}
