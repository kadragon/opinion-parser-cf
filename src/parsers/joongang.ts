import { extractDate, extractParagraphs, extractTitle } from "./shared";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class JoongangContentParser implements ArticleContentParser {
	readonly domain = "joongang.co.kr";
	readonly newspaper = "중앙일보";

	parse(html: string): ParsedArticle {
		return {
			title: extractTitle(html),
			publishedAt: extractDate(html),
			body: this.extractBody(html),
			newspaper: this.newspaper,
		};
	}

	private extractBody(html: string): string[] {
		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
		if (articleMatch) {
			const paragraphs = extractParagraphs(articleMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		const bodyMatch = html.match(
			/<div[^>]*(?:id|class)="[^"]*article[_-]?body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
		);
		if (bodyMatch) {
			const paragraphs = extractParagraphs(bodyMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		return extractParagraphs(html);
	}
}
