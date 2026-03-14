import { fetchWithRetry, parseDate } from "./base";
import type { NewspaperScraper, ScrapedArticle } from "./types";

const CHOSUN_BASE = "https://www.chosun.com";
const EDITORIAL_PATH = "/opinion/editorial/";
const API_URL = `${CHOSUN_BASE}/pf/api/v3/content/fetch/story-feed-sections?query=${encodeURIComponent(
	JSON.stringify({ uri: EDITORIAL_PATH, offset: 0, size: 20 }),
)}`;
const EDITORIAL_PAGE_URL = `${CHOSUN_BASE}${EDITORIAL_PATH}`;
const GOOGLE_NEWS_RSS_URL =
	"https://news.google.com/rss/search?q=site:chosun.com+%EC%82%AC%EC%84%A4&hl=ko&gl=KR&ceid=KR:ko";

interface ArcArticle {
	headlines?: { basic?: string };
	canonical_url?: string;
	website_url?: string;
	description?: { basic?: string };
	first_publish_date?: string;
	display_date?: string;
	publish_date?: string;
	promo_items?: {
		basic?: { url?: string; resized_params?: Record<string, string> };
	};
}

interface ArcApiResponse {
	content_elements?: ArcArticle[];
	articles?: ArcArticle[];
	data?: ArcArticle[];
}

export class ChosunScraper implements NewspaperScraper {
	readonly name = "조선일보";

	async scrape(): Promise<ScrapedArticle[]> {
		// Strategy 1: Fusion API
		try {
			const apiResponse = await fetchWithRetry(API_URL, {
				headers: { Accept: "application/json" },
			});
			const json = await apiResponse.json();
			const articles = this.parseApi(json);
			if (articles.length > 0) {
				return articles;
			}
		} catch {
			// API failed, try HTML fallback
		}

		// Strategy 2: HTML page with embedded JSON or links
		try {
			const pageResponse = await fetchWithRetry(EDITORIAL_PAGE_URL);
			const html = await pageResponse.text();
			const articles = this.parse(html);
			if (articles.length > 0) {
				return articles;
			}
		} catch {
			// HTML fallback failed, try Google News RSS
		}

		// Strategy 3: Google News RSS fallback
		try {
			const rssResponse = await fetchWithRetry(GOOGLE_NEWS_RSS_URL, {
				headers: { Accept: "application/rss+xml, application/xml, text/xml" },
			});
			const xml = await rssResponse.text();
			return this.parseGoogleRss(xml);
		} catch {
			return [];
		}
	}

	parseApi(json: unknown): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		if (!json || typeof json !== "object") return articles;

		const data = json as ArcApiResponse;
		const elements = data.content_elements ?? data.articles ?? data.data ?? [];

		for (const item of elements) {
			const article = this.parseArcArticle(item);
			if (article) {
				articles.push(article);
			}
		}

		return articles;
	}

	private parseArcArticle(item: ArcArticle): ScrapedArticle | null {
		const title = item.headlines?.basic;
		const path = item.canonical_url ?? item.website_url;
		if (!title || !path) return null;

		if (!path.includes("/opinion/") && !path.includes("/editorial/")) {
			return null;
		}

		const url = path.startsWith("http") ? path : `${CHOSUN_BASE}${path}`;
		const summary = item.description?.basic ?? null;
		const dateStr = item.first_publish_date ?? item.display_date ?? item.publish_date;
		const publishedAt = dateStr ? parseDate(dateStr) : new Date().toISOString();
		const imageUrl = item.promo_items?.basic?.url ?? null;

		return {
			newspaper: this.name,
			title: this.cleanTitle(title),
			url,
			summary: summary ? summary.slice(0, 200) : null,
			published_at: publishedAt,
			image_url: imageUrl,
		};
	}

	parse(html: string): ScrapedArticle[] {
		// Try embedded JSON first (__NEXT_DATA__, Fusion global state, etc.)
		const jsonArticles = this.parseEmbeddedJson(html);
		if (jsonArticles.length > 0) {
			return jsonArticles;
		}

		// Fallback to parsing anchor tags
		return this.parseFromAnchors(html);
	}

	private parseEmbeddedJson(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];

		// Look for __NEXT_DATA__ or Fusion.globalContent or similar embedded JSON
		const jsonPatterns = [
			/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
			/<script[^>]*>window\.__PRELOADED_STATE__\s*=\s*([\s\S]*?)<\/script>/i,
			/<script[^>]*>Fusion\.globalContent\s*=\s*([\s\S]*?)<\/script>/i,
			/<script[^>]*>window\.Fusion\s*=\s*([\s\S]*?)<\/script>/i,
		];

		for (const pattern of jsonPatterns) {
			const match = html.match(pattern);
			if (!match) continue;

			try {
				const jsonStr = match[1].replace(/;?\s*$/, "");
				const parsed = JSON.parse(jsonStr);
				const extracted = this.extractArticlesFromJson(parsed);
				if (extracted.length > 0) {
					return extracted;
				}
			} catch {
				// JSON parse failed, try next pattern
			}
		}

		return articles;
	}

	private extractArticlesFromJson(obj: unknown): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		if (!obj || typeof obj !== "object") return articles;

		const record = obj as Record<string, unknown>;

		// __NEXT_DATA__: props.pageProps.listData.articleList[]
		const articleList = this.findArticleList(record);
		if (articleList.length > 0) {
			for (const item of articleList) {
				const rec = item as Record<string, unknown>;
				const title = rec.title as string | undefined;
				const url = rec.url as string | undefined;
				const createDate = rec.createDate as string | undefined;
				const prologue = rec.prologue as string | undefined;

				if (!title || !url) continue;

				const fullUrl = (url as string).startsWith("http") ? url : `${CHOSUN_BASE}${url}`;

				articles.push({
					newspaper: this.name,
					title: this.cleanTitle(title),
					url: fullUrl,
					summary: prologue ? this.stripTags(prologue).slice(0, 200) : null,
					published_at: createDate ? parseDate(createDate) : parseDate(new Date().toISOString()),
					image_url: null,
				});
			}
			if (articles.length > 0) return articles;
		}

		// Fallback: Arc content_elements
		if (Array.isArray(record.content_elements)) {
			for (const item of record.content_elements) {
				const article = this.parseArcArticle(item as ArcArticle);
				if (article) articles.push(article);
			}
			if (articles.length > 0) return articles;
		}

		// Traverse nested objects
		for (const value of Object.values(record)) {
			if (value && typeof value === "object" && !Array.isArray(value)) {
				const nested = this.extractArticlesFromJson(value);
				if (nested.length > 0) return nested;
			}
		}

		return articles;
	}

	private findArticleList(obj: unknown): unknown[] {
		if (!obj || typeof obj !== "object") return [];
		const record = obj as Record<string, unknown>;

		// Direct path: props.pageProps.listData.articleList
		const props = record.props as Record<string, unknown> | undefined;
		const pageProps = props?.pageProps as Record<string, unknown> | undefined;
		const listData = pageProps?.listData as Record<string, unknown> | undefined;
		if (Array.isArray(listData?.articleList)) {
			return listData.articleList;
		}

		// Also check articleList at current level
		if (Array.isArray(record.articleList)) {
			return record.articleList;
		}

		// Recurse into nested objects
		for (const value of Object.values(record)) {
			if (value && typeof value === "object" && !Array.isArray(value)) {
				const result = this.findArticleList(value);
				if (result.length > 0) return result;
			}
		}

		return [];
	}

	private parseFromAnchors(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		const anchorPattern = /<a[^>]*href="(\/opinion\/editorial\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
		let match: RegExpExecArray | null;

		while ((match = anchorPattern.exec(html)) !== null) {
			const url = `${CHOSUN_BASE}${match[1]}`;
			const innerHtml = match[2];
			const title = this.stripTags(innerHtml).trim();

			if (!title || articles.some((a) => a.url === url)) continue;

			articles.push({
				newspaper: this.name,
				title: this.cleanTitle(title),
				url,
				summary: null,
				published_at: new Date().toISOString(),
				image_url: null,
			});
		}

		return articles;
	}

	private parseGoogleRss(xml: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
		let match: RegExpExecArray | null;

		while ((match = itemPattern.exec(xml)) !== null) {
			const itemXml = match[1];
			const title = this.extractTag(itemXml, "title");
			const link = this.extractTag(itemXml, "link");
			const pubDate = this.extractTag(itemXml, "pubDate");

			if (!title || !link) continue;

			// Only include chosun.com editorial links
			const chosunUrlMatch = link.match(
				/(https?:\/\/www\.chosun\.com\/opinion\/editorial\/[^\s&"<]+)/,
			);
			if (!chosunUrlMatch) {
				// Google News wraps URLs; check the title for editorial indicators
				const isSasul = title.includes("사설") || title.includes("[사설]");
				if (!isSasul) continue;
			}

			const url = chosunUrlMatch ? chosunUrlMatch[1] : link;

			if (articles.some((a) => a.url === url)) continue;

			articles.push({
				newspaper: this.name,
				title: this.cleanTitle(title),
				url,
				summary: null,
				published_at: pubDate ? parseDate(pubDate) : new Date().toISOString(),
				image_url: null,
			});
		}

		return articles;
	}

	private extractTag(xml: string, tag: string): string | null {
		const cdataPattern = new RegExp(
			`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
			"i",
		);
		const cdataMatch = xml.match(cdataPattern);
		if (cdataMatch) return cdataMatch[1].trim();

		const simplePattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
		const simpleMatch = xml.match(simplePattern);
		return simpleMatch ? this.decodeEntities(simpleMatch[1].trim()) : null;
	}

	private cleanTitle(title: string): string {
		return title
			.replace(/^\[사설\]\s*/, "")
			.replace(/^\[칼럼\]\s*/, "")
			.trim();
	}

	private stripTags(html: string): string {
		return html
			.replace(/<[^>]+>/g, "")
			.replace(/\s+/g, " ")
			.trim();
	}

	private decodeEntities(text: string): string {
		return text
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'");
	}
}
