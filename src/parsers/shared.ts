import { cleanText, parseDate } from "../scrapers/base";

export function extractTitle(html: string): string {
	const ogMatch =
		html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ??
		html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/);
	if (ogMatch) return cleanText(ogMatch[1]);

	const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
	if (h1Match) return cleanText(h1Match[1]);

	return "";
}

export function extractDate(html: string): string {
	const metaMatch =
		html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]*)"/) ??
		html.match(/<meta[^>]*content="([^"]*)"[^>]*property="article:published_time"/);
	if (metaMatch) return parseDate(metaMatch[1]);

	const dateMatch = html.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s+\d{1,2}:\d{2})/);
	if (dateMatch) return parseDate(dateMatch[1]);

	return "";
}

export function extractParagraphs(html: string): string[] {
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

export function extractFromNextData(obj: unknown): string[] {
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
			return extractParagraphs(content);
		}
	}

	return [];
}
