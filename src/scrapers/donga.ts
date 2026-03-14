import { decodeEntities, fetchWithRetry, parseDate, stripHtmlTags } from "./base";
import type { NewspaperScraper, ScrapedArticle } from "./types";

export class DongaScraper implements NewspaperScraper {
	readonly name = "동아일보";
	private readonly url = "https://rss.donga.com/editorials.xml";

	async scrape(): Promise<ScrapedArticle[]> {
		const response = await fetchWithRetry(this.url, {
			headers: { Accept: "application/rss+xml, application/xml, text/xml" },
		});
		const xml = await response.text();
		return this.parse(xml);
	}

	parse(xml: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
		let match: RegExpExecArray | null;

		while ((match = itemPattern.exec(xml)) !== null) {
			const itemXml = match[1];
			const article = this.parseItem(itemXml);
			if (article) {
				articles.push(article);
			}
		}

		return articles;
	}

	private parseItem(xml: string): ScrapedArticle | null {
		const title = this.extractTag(xml, "title");
		const link = this.extractTag(xml, "link");
		const pubDate = this.extractTag(xml, "pubDate");
		const description = this.extractTag(xml, "description");

		if (!title || !link) return null;

		const isSasul = title.includes("[사설]") || title.includes("사설");

		if (!isSasul) return null;

		const cleanTitle = title.replace(/^\[사설\]\s*/, "").trim();

		return {
			newspaper: this.name,
			title: cleanTitle || title,
			url: link,
			summary: description ? stripHtmlTags(description).trim().slice(0, 200) : null,
			published_at: pubDate ? parseDate(pubDate) : new Date().toISOString(),
			image_url: null,
		};
	}

	private extractTag(xml: string, tag: string): string | null {
		const cdataPattern = new RegExp(
			`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
			"i",
		);
		const cdataMatch = xml.match(cdataPattern);
		if (cdataMatch) return cdataMatch[1].trim();

		const simplePattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
		const simpleMatch = xml.match(simplePattern);
		return simpleMatch ? decodeEntities(simpleMatch[1].trim()) : null;
	}
}
