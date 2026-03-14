import { cleanText, fetchWithRetry, parseDate } from "./base";
import type { NewspaperScraper, ScrapedArticle } from "./types";

export class KhanScraper implements NewspaperScraper {
	readonly name = "경향신문";
	private readonly url = "https://www.khan.co.kr/opinion/editorial/articles";

	async scrape(): Promise<ScrapedArticle[]> {
		const response = await fetchWithRetry(this.url);
		const html = await response.text();
		return this.parse(html);
	}

	parse(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];

		// Extract each <li> containing <article> from the list
		const liPattern = /<li>\s*<article>([\s\S]*?)<\/article>\s*<\/li>/gi;
		let liMatch: RegExpExecArray | null;

		while ((liMatch = liPattern.exec(html)) !== null) {
			const article = this.parseItem(liMatch[1]);
			if (article) {
				articles.push(article);
			}
		}

		// Fallback: extract any khan.co.kr/article/ links with [사설] in title
		if (articles.length === 0) {
			return this.parseFromAnchors(html);
		}

		return articles;
	}

	private parseFromAnchors(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];
		const anchorPattern =
			/<a[^>]*href="(https?:\/\/www\.khan\.co\.kr\/article\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
		let match: RegExpExecArray | null;

		while ((match = anchorPattern.exec(html)) !== null) {
			const url = match[1];
			const titleHtml = match[2];
			const title = cleanText(titleHtml).trim();

			if (title?.includes("[사설]") && !articles.some((a) => a.url === url)) {
				articles.push({
					newspaper: this.name,
					title: title.replace(/^\[사설\]\s*/, "").trim(),
					url,
					summary: null,
					published_at: new Date().toISOString(),
					image_url: null,
				});
			}
		}

		return articles;
	}

	private parseItem(html: string): ScrapedArticle | null {
		// Links are absolute: href="https://www.khan.co.kr/article/202603131804001"
		const hrefMatch = html.match(/href="(https?:\/\/www\.khan\.co\.kr\/article\/[^"]+)"/);
		if (!hrefMatch) return null;

		const url = hrefMatch[1];

		// Title is in the <a> tag or the <img alt="">
		const titleMatch =
			html.match(/<a[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/) ?? html.match(/alt="([^"]+)"/);

		const rawTitle = titleMatch ? cleanText(titleMatch[1]).trim() : null;
		if (!rawTitle) return null;

		// Clean [사설] prefix
		const title = rawTitle.replace(/^\[사설\]\s*/, "").trim();

		// Summary from <p class="desc">
		const summaryMatch = html.match(/<p[^>]*class="desc"[^>]*>([\s\S]*?)<\/p>/);
		const summary = summaryMatch ? cleanText(summaryMatch[1]).trim().slice(0, 200) : null;

		// Date from <p class="date">
		const dateMatch = html.match(/<p[^>]*class="date"[^>]*>([\s\S]*?)<\/p>/);
		let publishedAt = new Date().toISOString();
		if (dateMatch) {
			const dateText = cleanText(dateMatch[1]).trim();
			const parsed = dateText.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
			if (parsed) {
				publishedAt = parseDate(
					`${parsed[1]}-${parsed[2]}-${parsed[3]}T${parsed[4]}:${parsed[5]}:00`,
				);
			}
		}

		// Image from <img src="...">
		const imgMatch = html.match(/<img[^>]*src="([^"]+)"/);
		const imageUrl = imgMatch ? imgMatch[1] : null;

		return {
			newspaper: this.name,
			title,
			url,
			summary,
			published_at: publishedAt,
			image_url: imageUrl,
		};
	}
}
