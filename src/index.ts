import { Hono } from "hono";
import { handleCron } from "./cron/handler";
import { createCorsMiddleware } from "./middleware/cors";
import articles from "./routes/articles";
import bookmarks from "./routes/bookmarks";
import feed from "./routes/feed";
import scrape from "./routes/scrape";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", createCorsMiddleware());

app.route("/api/articles", articles);
app.route("/api/bookmarks", bookmarks);
app.route("/api/scrape", scrape);
app.route("/api/feed", feed);

export default {
	fetch: app.fetch,
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(handleCron(env.DB));
	},
};
