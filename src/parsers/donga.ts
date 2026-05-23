import { extractDate, extractParagraphs, extractTitle } from "./shared";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class DongaContentParser implements ArticleContentParser {
	readonly domain = "donga.com";
	readonly newspaper = "동아일보";

	parse(html: string): ParsedArticle {
		return {
			title: extractTitle(html),
			publishedAt: extractDate(html),
			body: this.extractBody(html),
			newspaper: this.newspaper,
		};
	}

	private extractBody(html: string): string[] {
		const containerMatch = html.match(
			/<div[^>]*class="[^"]*(?:main_view|news_view)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*(?:relate|copyright|ad_)|<\/section|<\/article)/i,
		);
		if (containerMatch) {
			const paragraphs = extractParagraphs(containerMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		const broadMatch = html.match(
			/<div[^>]*class="[^"]*(?:main_view|news_view)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
		);
		if (broadMatch) {
			const paragraphs = extractParagraphs(broadMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
		if (articleMatch) {
			const paragraphs = extractParagraphs(articleMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		return extractParagraphs(html);
	}
}
