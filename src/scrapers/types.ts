export interface ScrapedArticle {
	newspaper: string;
	title: string;
	url: string;
	summary: string | null;
	published_at: string;
	image_url: string | null;
}

export interface NewspaperScraper {
	readonly name: string;
	scrape(): Promise<ScrapedArticle[]>;
}
