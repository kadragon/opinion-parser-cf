import { ChosunContentParser } from "../parsers/chosun";
import { DongaContentParser } from "../parsers/donga";
import { HaniContentParser } from "../parsers/hani";
import { JoongangContentParser } from "../parsers/joongang";
import { KhanContentParser } from "../parsers/khan";
import type { ArticleContentParser } from "../parsers/types";
import { ChosunScraper } from "../scrapers/chosun";
import { DongaScraper } from "../scrapers/donga";
import { HaniScraper } from "../scrapers/hani";
import { JoongangScraper } from "../scrapers/joongang";
import { KhanScraper } from "../scrapers/khan";
import type { NewspaperScraper } from "../scrapers/types";

export interface Newspaper {
	scraper: NewspaperScraper;
	contentParser: ArticleContentParser;
}

export const newspapers: Newspaper[] = [
	{ scraper: new JoongangScraper(), contentParser: new JoongangContentParser() },
	{ scraper: new ChosunScraper(), contentParser: new ChosunContentParser() },
	{ scraper: new DongaScraper(), contentParser: new DongaContentParser() },
	{ scraper: new HaniScraper(), contentParser: new HaniContentParser() },
	{ scraper: new KhanScraper(), contentParser: new KhanContentParser() },
];
