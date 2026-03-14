import { ChosunScraper } from "./chosun";
import { DongaScraper } from "./donga";
import { HaniScraper } from "./hani";
import { JoongangScraper } from "./joongang";
import { KhanScraper } from "./khan";
import type { NewspaperScraper } from "./types";

export function getAllScrapers(): NewspaperScraper[] {
	return [
		new JoongangScraper(),
		new ChosunScraper(),
		new DongaScraper(),
		new HaniScraper(),
		new KhanScraper(),
	];
}
