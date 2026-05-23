import { extractDate, extractFromNextData, extractParagraphs, extractTitle } from "./shared";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class ChosunContentParser implements ArticleContentParser {
	readonly domain = "chosun.com";
	readonly newspaper = "조선일보";

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
			} catch {}
		}

		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
		return extractParagraphs(articleMatch ? articleMatch[1] : html);
	}
}
