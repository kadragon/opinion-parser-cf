import { extractDate, extractFromNextData, extractParagraphs, extractTitle } from "./shared";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class HaniContentParser implements ArticleContentParser {
	readonly domain = "hani.co.kr";
	readonly newspaper = "한겨레";

	parse(html: string): ParsedArticle {
		return {
			title: extractTitle(html),
			publishedAt: extractDate(html),
			body: this.extractBody(html),
			newspaper: this.newspaper,
		};
	}

	private extractBody(html: string): string[] {
		const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
		if (nextDataMatch) {
			try {
				const paragraphs = extractFromNextData(JSON.parse(nextDataMatch[1]));
				if (paragraphs.length > 0) return paragraphs;
			} catch {
				/* fall through to HTML extraction */
			}
		}

		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
		return extractParagraphs(articleMatch ? articleMatch[1] : html);
	}
}
