import { newspapers } from "../newspapers/registry";
import type { NewspaperScraper } from "./types";

export function getAllScrapers(): NewspaperScraper[] {
	return newspapers.map((n) => n.scraper);
}
