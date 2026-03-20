import { cleanText, parseDate } from "../scrapers/base";
import type { ArticleContentParser, ParsedArticle } from "./types";

export class HaniContentParser implements ArticleContentParser {
	readonly domain = "hani.co.kr";
	readonly newspaper = "한겨레";

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
		// Strategy 1: __NEXT_DATA__ JSON
		const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
		if (nextDataMatch) {
			try {
				const data = JSON.parse(nextDataMatch[1]);
				const paragraphs = this.extractFromNextData(data);
				if (paragraphs.length > 0) return paragraphs;
			} catch {
				// fallback to HTML parsing
			}
		}

		// Strategy 2: article body <p> tags
		const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
		const container = articleMatch ? articleMatch[1] : html;

		return this.extractParagraphs(container);
	}

	private extractFromNextData(obj: unknown): string[] {
		if (!obj || typeof obj !== "object") return [];
		const record = obj as Record<string, unknown>;

		const props = record.props as Record<string, unknown> | undefined;
		const pageProps = props?.pageProps as Record<string, unknown> | undefined;

		if (pageProps) {
			const article = pageProps.article as Record<string, unknown> | undefined;
			const content = (article?.content ?? article?.body ?? pageProps.content ?? pageProps.body) as
				| string
				| undefined;
			if (typeof content === "string" && content.length > 0) {
				return this.extractParagraphs(content);
			}
		}

		return [];
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
