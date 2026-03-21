import { cleanText, fetchWithRetry, parseDate } from "./base";
import type { NewspaperScraper, ScrapedArticle } from "./types";

export class JoongangScraper implements NewspaperScraper {
	readonly name = "중앙일보";
	private readonly baseUrl = "https://www.joongang.co.kr";
	private readonly url = "https://www.joongang.co.kr/opinion/editorialcolumn";

	async scrape(): Promise<ScrapedArticle[]> {
		const response = await fetchWithRetry(this.url);
		const html = await response.text();
		return this.parse(html);
	}

	parse(html: string): ScrapedArticle[] {
		const articles: ScrapedArticle[] = [];

		// Primary pattern: ul.story_list > li with h2.headline > a
		const storyListMatch = html.match(/<ul[^>]*class="[^"]*story_list[^"]*"[^>]*>([\s\S]*?)<\/ul>/);

		if (storyListMatch) {
			const listHtml = storyListMatch[1];
			const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/g;
			let liMatch: RegExpExecArray | null;

			while ((liMatch = liPattern.exec(listHtml)) !== null) {
				const article = this.parseListItem(liMatch[1]);
				if (article) {
					articles.push(article);
				}
			}
		}

		// Fallback pattern: .story_list .card
		if (articles.length === 0) {
			const cardPattern = /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
			let cardMatch: RegExpExecArray | null;

			while ((cardMatch = cardPattern.exec(html)) !== null) {
				const article = this.parseCardItem(cardMatch[1]);
				if (article) {
					articles.push(article);
				}
			}
		}

		return articles;
	}

	private parseListItem(liHtml: string): ScrapedArticle | null {
		// Extract link and title from h2.headline > a
		const headlineMatch = liHtml.match(
			/<h2[^>]*class="[^"]*headline[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/,
		);

		if (!headlineMatch) {
			return null;
		}

		const rawUrl = headlineMatch[1];
		const title = cleanText(headlineMatch[2]);
		const url = this.resolveUrl(rawUrl);

		if (!title || !url) {
			return null;
		}

		const summary = this.extractSummary(liHtml);
		const publishedAt = this.extractDate(liHtml);
		const imageUrl = this.extractImage(liHtml);

		return {
			newspaper: this.name,
			title,
			url,
			summary,
			published_at: publishedAt,
			image_url: imageUrl,
		};
	}

	private parseCardItem(cardHtml: string): ScrapedArticle | null {
		const linkMatch = cardHtml.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);

		if (!linkMatch) {
			return null;
		}

		const rawUrl = linkMatch[1];
		const title = cleanText(linkMatch[2]);
		const url = this.resolveUrl(rawUrl);

		if (!title || !url) {
			return null;
		}

		const summary = this.extractSummary(cardHtml);
		const publishedAt = this.extractDate(cardHtml);
		const imageUrl = this.extractImage(cardHtml);

		return {
			newspaper: this.name,
			title,
			url,
			summary,
			published_at: publishedAt,
			image_url: imageUrl,
		};
	}

	private resolveUrl(rawUrl: string): string {
		if (rawUrl.startsWith("http")) {
			return rawUrl;
		}
		return `${this.baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
	}

	private extractSummary(html: string): string | null {
		// Try .ab_summary or .lead or p tag with summary-like class
		const summaryMatch =
			html.match(/<p[^>]*class="[^"]*(?:ab_summary|lead|summary)[^"]*"[^>]*>([\s\S]*?)<\/p>/) ||
			html.match(/<p[^>]*class="[^"]*standfirst[^"]*"[^>]*>([\s\S]*?)<\/p>/);

		if (summaryMatch) {
			const text = cleanText(summaryMatch[1]);
			return text || null;
		}

		return null;
	}

	private extractDate(html: string): string {
		// <p class="date">2026.03.14 00:34</p>
		const dateTagMatch = html.match(
			/<p[^>]*class="[^"]*date[^"]*"[^>]*>\s*(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})\s*<\/p>/,
		);
		if (dateTagMatch) {
			return parseDate(dateTagMatch[1].replace(/\./g, "-"));
		}

		// datetime attribute
		const datetimeMatch = html.match(/datetime="([^"]*)"/);
		if (datetimeMatch) {
			return parseDate(datetimeMatch[1]);
		}

		// Fallback: visible text date pattern (not inside URLs/attributes)
		const textDateMatch = html.match(/>(\d{4}[.-]\d{2}[.-]\d{2}\s+\d{2}:\d{2})</);
		if (textDateMatch) {
			return parseDate(textDateMatch[1].replace(/\./g, "-"));
		}

		return parseDate(new Date().toISOString());
	}

	private extractImage(html: string): string | null {
		const imgMatch = html.match(/<img[^>]*src="([^"]*)"/) || html.match(/data-src="([^"]*)"/);

		if (imgMatch) {
			const src = imgMatch[1];
			if (src.startsWith("http")) {
				return src;
			}
			return `${this.baseUrl}${src.startsWith("/") ? "" : "/"}${src}`;
		}

		return null;
	}
}
