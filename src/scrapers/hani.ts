import { cleanText, fetchWithRetry, parseDate } from "./base";
import type { NewspaperScraper, ScrapedArticle } from "./types";

interface NextDataArticle {
	id?: number;
	title?: string;
	subtitle?: string;
	published_at?: string;
	createDate?: string;
	thumbnail?: string;
	article_url?: string;
	url?: string;
}

export class HaniScraper implements NewspaperScraper {
	readonly name = "한겨레";
	private readonly url = "https://www.hani.co.kr/arti/opinion/editorial";
	private readonly baseUrl = "https://www.hani.co.kr";

	async scrape(): Promise<ScrapedArticle[]> {
		const response = await fetchWithRetry(this.url);
		const html = await response.text();
		return this.parse(html);
	}

	parse(html: string): ScrapedArticle[] {
		const fromNextData = this.parseNextData(html);
		if (fromNextData.length > 0) {
			return fromNextData;
		}

		return this.parseFromAnchors(html);
	}

	private parseNextData(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];

		const scriptMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
		if (!scriptMatch) return articles;

		try {
			const data = JSON.parse(scriptMatch[1]);
			const items = this.findArticleList(data);

			for (const item of items) {
				const article = this.mapNextDataArticle(item);
				if (article) {
					articles.push(article);
				}
			}
		} catch {
			return articles;
		}

		return articles;
	}

	private findArticleList(obj: unknown): NextDataArticle[] {
		if (!obj || typeof obj !== "object") return [];

		const record = obj as Record<string, unknown>;

		// Direct path: props.pageProps.listData.articleList
		const props = record.props as Record<string, unknown> | undefined;
		const pageProps = props?.pageProps as Record<string, unknown> | undefined;
		const listData = pageProps?.listData as Record<string, unknown> | undefined;
		if (Array.isArray(listData?.articleList)) {
			return listData.articleList as NextDataArticle[];
		}

		// Check articleList at current level
		if (Array.isArray(record.articleList)) {
			return record.articleList as NextDataArticle[];
		}

		// Fallback: generic array search
		if (Array.isArray(obj)) {
			if (
				obj.length > 0 &&
				typeof obj[0] === "object" &&
				obj[0] !== null &&
				("title" in obj[0] || "article_url" in obj[0])
			) {
				return obj as NextDataArticle[];
			}
			for (const item of obj) {
				const result = this.findArticleList(item);
				if (result.length > 0) return result;
			}
			return [];
		}

		// Recurse into nested objects
		for (const value of Object.values(record)) {
			const result = this.findArticleList(value);
			if (result.length > 0) return result;
		}

		return [];
	}

	private mapNextDataArticle(item: NextDataArticle): ScrapedArticle | null {
		const title = item.title ? cleanText(item.title).trim() : null;
		if (!title) return null;

		const rawUrl = item.url ?? item.article_url;
		let url: string;
		if (rawUrl) {
			url = rawUrl.startsWith("http") ? rawUrl : `${this.baseUrl}${rawUrl}`;
		} else if (item.id) {
			url = `${this.baseUrl}/arti/opinion/editorial/${item.id}.html`;
		} else {
			return null;
		}

		const summary = item.subtitle ? cleanText(item.subtitle).trim() : null;

		const dateStr = item.createDate ?? item.published_at;
		const publishedAt = dateStr ? parseDate(dateStr) : parseDate(new Date().toISOString());

		const imageUrl = item.thumbnail ?? null;

		return {
			newspaper: this.name,
			title,
			url,
			summary: summary || null,
			published_at: publishedAt,
			image_url: imageUrl,
		};
	}

	private parseFromAnchors(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		const anchorPattern =
			/<a[^>]*href="(\/arti\/opinion\/editorial\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
		let match: RegExpExecArray | null;

		while ((match = anchorPattern.exec(html)) !== null) {
			const url = `${this.baseUrl}${match[1]}`;
			const titleHtml = match[2];
			const title = cleanText(titleHtml).trim();

			if (title && !articles.some((a) => a.url === url)) {
				const context = this.extractContext(html, match.index);

				articles.push({
					newspaper: this.name,
					title,
					url,
					summary: context.summary,
					published_at: context.publishedAt,
					image_url: context.imageUrl,
				});
			}
		}

		return articles;
	}

	private extractContext(
		html: string,
		position: number,
	): {
		summary: string | null;
		publishedAt: string;
		imageUrl: string | null;
	} {
		const start = Math.max(0, position - 1000);
		const end = Math.min(html.length, position + 2000);
		const surrounding = html.substring(start, end);

		const summaryMatch = surrounding.match(
			/<(?:p|span|div)[^>]*class="[^"]*(?:desc|summary|sub|lead|excerpt)[^"]*"[^>]*>([\s\S]*?)<\//,
		);
		const summary = summaryMatch ? cleanText(summaryMatch[1]).trim() : null;

		const dateMatch = surrounding.match(
			/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[\s]*(\d{1,2}:\d{2})?/,
		);
		const publishedAt = dateMatch
			? parseDate(
					`${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}T${dateMatch[4] ?? "00:00"}:00`,
				)
			: new Date().toISOString();

		const imgMatch = surrounding.match(/<img[^>]*src="([^"]+)"/);
		const imageUrl = imgMatch ? imgMatch[1] : null;

		return { summary: summary || null, publishedAt, imageUrl };
	}
}
