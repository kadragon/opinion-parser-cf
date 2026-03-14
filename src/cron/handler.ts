import { insertArticles } from "../db/repository";
import { getAllScrapers } from "../scrapers/index";

export async function handleCron(db: D1Database): Promise<{
	results: { newspaper: string; inserted: number; error?: string }[];
	totalInserted: number;
}> {
	const scrapers = getAllScrapers();
	const results: { newspaper: string; inserted: number; error?: string }[] = [];
	let totalInserted = 0;

	for (const scraper of scrapers) {
		try {
			const articles = await scraper.scrape();
			const inserted = await insertArticles(db, articles);
			totalInserted += inserted;
			results.push({ newspaper: scraper.name, inserted });
			console.log(`[CRON] ${scraper.name}: ${inserted} articles inserted`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			results.push({ newspaper: scraper.name, inserted: 0, error: message });
			console.error(`[CRON] ${scraper.name}: error - ${message}`);
		}
	}

	console.log(`[CRON] Total inserted: ${totalInserted}`);
	return { results, totalInserted };
}
