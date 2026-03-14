import { insertArticles } from "../db/repository";
import { getAllScrapers } from "../scrapers/index";

export async function handleCron(db: D1Database): Promise<{
	results: { newspaper: string; inserted: number; error?: string }[];
	totalInserted: number;
}> {
	const scrapers = getAllScrapers();
	const results: { newspaper: string; inserted: number; error?: string }[] = [];
	let totalInserted = 0;

	const settled = await Promise.allSettled(
		scrapers.map(async (scraper) => {
			const articles = await scraper.scrape();
			const inserted = await insertArticles(db, articles);
			return { newspaper: scraper.name, inserted };
		}),
	);

	for (const result of settled) {
		if (result.status === "fulfilled") {
			const { newspaper, inserted } = result.value;
			totalInserted += inserted;
			results.push({ newspaper, inserted });
			console.log(`[CRON] ${newspaper}: ${inserted} articles inserted`);
		} else {
			const message =
				result.reason instanceof Error ? result.reason.message : String(result.reason);
			results.push({ newspaper: "unknown", inserted: 0, error: message });
			console.error(`[CRON] error - ${message}`);
		}
	}

	console.log(`[CRON] Total inserted: ${totalInserted}`);
	return { results, totalInserted };
}
