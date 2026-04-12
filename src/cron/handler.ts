import { insertArticles, markRemovedArticles } from "../db/repository";
import { getAllScrapers } from "../scrapers/index";

export async function handleCron(db: D1Database): Promise<{
	results: {
		newspaper: string;
		inserted: number;
		removed: number;
		restored: number;
		error?: string;
	}[];
	totalInserted: number;
}> {
	const scrapers = getAllScrapers();
	const results: {
		newspaper: string;
		inserted: number;
		removed: number;
		restored: number;
		error?: string;
	}[] = [];
	let totalInserted = 0;

	const settled = await Promise.allSettled(
		scrapers.map(async (scraper) => {
			const articles = await scraper.scrape();
			const inserted = await insertArticles(db, articles);
			const activeUrls = articles.map((a) => a.url);
			const { removed, restored } = await markRemovedArticles(db, scraper.name, activeUrls);
			return { newspaper: scraper.name, inserted, removed, restored };
		}),
	);

	for (const result of settled) {
		if (result.status === "fulfilled") {
			const { newspaper, inserted, removed, restored } = result.value;
			totalInserted += inserted;
			results.push({ newspaper, inserted, removed, restored });
			console.log(
				`[CRON] ${newspaper}: ${inserted} inserted, ${removed} removed, ${restored} restored`,
			);
		} else {
			const message =
				result.reason instanceof Error ? result.reason.message : String(result.reason);
			results.push({ newspaper: "unknown", inserted: 0, removed: 0, restored: 0, error: message });
			console.error(`[CRON] error - ${message}`);
		}
	}

	console.log(`[CRON] Total inserted: ${totalInserted}`);
	return { results, totalInserted };
}
