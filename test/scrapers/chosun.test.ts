import { describe, expect, it } from "vitest";
import { ChosunScraper } from "../../src/scrapers/chosun";

describe("ChosunScraper", () => {
	const scraper = new ChosunScraper();

	it("has correct newspaper name", () => {
		expect(scraper.name).toBe("조선일보");
	});

	describe("parseApi", () => {
		it("parses Arc API response with content_elements", () => {
			const json = {
				content_elements: [
					{
						headlines: { basic: "사설 제목 1" },
						canonical_url: "/opinion/editorial/2026/03/14/abc",
						description: { basic: "요약 내용" },
						first_publish_date: "2026-03-14T00:00:00Z",
						promo_items: { basic: { url: "https://img.chosun.com/test.jpg" } },
					},
					{
						headlines: { basic: "다른 기사" },
						canonical_url: "/economy/article/123",
						description: { basic: "경제 기사" },
						first_publish_date: "2026-03-14T00:00:00Z",
					},
				],
			};

			const articles = scraper.parseApi(json);
			expect(articles).toHaveLength(1);
			expect(articles[0].title).toBe("사설 제목 1");
			expect(articles[0].url).toContain("chosun.com");
			expect(articles[0].newspaper).toBe("조선일보");
		});

		it("returns empty array for null input", () => {
			expect(scraper.parseApi(null)).toHaveLength(0);
		});

		it("returns empty array for empty object", () => {
			expect(scraper.parseApi({})).toHaveLength(0);
		});
	});

	describe("parse", () => {
		it("extracts articles from anchor tags", () => {
			const html = `
				<div>
					<a href="/opinion/editorial/2026/03/14/abc">사설: 경제 성장</a>
					<a href="/opinion/editorial/2026/03/14/def">사설: 교육 정책</a>
				</div>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(2);
			expect(articles[0].url).toContain("chosun.com/opinion/editorial/");
		});

		it("returns empty for HTML with no editorial links", () => {
			const html = "<html><body>Hello</body></html>";
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(0);
		});
	});
});
