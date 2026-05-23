import { extractDate, extractParagraphs, extractTitle } from "./shared";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class KhanContentParser implements ArticleContentParser {
	readonly domain = "khan.co.kr";
	readonly newspaper = "경향신문";

	parse(html: string): ParsedArticle {
		return {
			title: extractTitle(html),
			publishedAt: extractDate(html),
			body: this.extractBody(html),
			newspaper: this.newspaper,
		};
	}

	private extractBody(html: string): string[] {
		const readingMatch = html.match(/<div[^>]*id="readingPoint"[^>]*>([\s\S]*?)<\/div>/i);
		if (readingMatch) {
			const paragraphs = extractParagraphs(readingMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		const bodyMatch = html.match(
			/<div[^>]*class="[^"]*article[_-]?body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
		);
		if (bodyMatch) {
			const paragraphs = extractParagraphs(bodyMatch[1]);
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
