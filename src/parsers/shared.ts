import { cleanText, parseDate } from "../scrapers/base";

export function extractBalancedJson(html: string, startIndex: number): unknown | null {
	const text = html.slice(startIndex);
	let depth = 0;
	let inString = false;
	let escaped = false;
	let end = -1;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (ch === "\\") {
			escaped = true;
			continue;
		}
		if (ch === '"') {
			inString = !inString;
			continue;
		}
		if (inString) continue;
		if (ch === "{") {
			depth++;
		} else if (ch === "}") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}

	if (end === -1) return null;
	try {
		return JSON.parse(text.slice(0, end + 1));
	} catch {
		return null;
	}
}

export function extractFusionGlobalContent(html: string): string[] {
	const match = html.match(/Fusion\.globalContent\s*=\s*\{/);
	if (!match || match.index === undefined) return [];

	const braceStart = match.index + match[0].length - 1;
	const obj = extractBalancedJson(html, braceStart);
	if (!obj || typeof obj !== "object") return [];

	const record = obj as Record<string, unknown>;
	const elements = record.content_elements;
	if (!Array.isArray(elements)) return [];

	const result: string[] = [];
	for (const el of elements) {
		if (!el || typeof el !== "object") continue;
		const elem = el as Record<string, unknown>;
		if (elem.type !== "text") continue;
		const content = elem.content;
		if (typeof content !== "string") continue;
		const text = cleanText(content);
		if (text.length > 0) result.push(text);
	}
	return result;
}

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
