import { cleanText, parseDate } from "../scrapers/base";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class DongaContentParser implements ArticleContentParser {
	readonly domain = "donga.com";
	readonly newspaper = "동아일보";

	parse(html: string): ParsedArticle {
		const title = this.extractTitle(html);
		const publishedAt = this.extractDate(html);
		const body = this.extractBody(html);

		return { title, publishedAt, body, newspaper: this.newspaper };
	}

	private extractTitle(html: string): string {
		const ogMatch =
			html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ??
			html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/);
		if (ogMatch) return cleanText(ogMatch[1]);

		const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
		if (h1Match) return cleanText(h1Match[1]);

		return "";
	}

	private extractDate(html: string): string {
		const metaMatch =
			html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]*)"/) ??
			html.match(/<meta[^>]*content="([^"]*)"[^>]*property="article:published_time"/);
		if (metaMatch) return parseDate(metaMatch[1]);

		const dateMatch = html.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s+\d{1,2}:\d{2})/);
		if (dateMatch) return parseDate(dateMatch[1]);

		return "";
	}

	private extractBody(html: string): string[] {
		// Strategy 1: .main_view or .news_view container
		const containerMatch = html.match(
			/<div[^>]*class="[^"]*(?:main_view|news_view)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*(?:relate|copyright|ad_)|<\/section|<\/article)/i,
		);
		if (containerMatch) {
			const paragraphs = this.extractParagraphs(containerMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		// Strategy 2: broader search for .main_view or .news_view
		const broadMatch = html.match(
			/<div[^>]*class="[^"]*(?:main_view|news_view)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
		);
		if (broadMatch) {
			const paragraphs = this.extractParagraphs(broadMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		// Strategy 3: article body
		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
		if (articleMatch) {
			const paragraphs = this.extractParagraphs(articleMatch[1]);
			if (paragraphs.length > 0) return paragraphs;
		}

		return this.extractParagraphs(html);
	}

	private extractParagraphs(html: string): string[] {
		const paragraphs: string[] = [];
		const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
		let match: RegExpExecArray | null;

		while ((match = pPattern.exec(html)) !== null) {
			const text = cleanText(match[1]);
			if (text.length > 0) {
				paragraphs.push(text);
			}
		}

		return paragraphs;
	}
}
