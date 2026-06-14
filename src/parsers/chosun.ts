import {
	extractDate,
	extractFromNextData,
	extractFusionGlobalContent,
	extractParagraphs,
	extractTitle,
} from "./shared";
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
		// Strategy 1: Arc/Fusion SPA — body in Fusion.globalContent.content_elements
		const arc = extractFusionGlobalContent(html);
		if (arc.length > 0) return arc;

		// Strategy 2: Next.js SPA — body in __NEXT_DATA__ embedded JSON
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
