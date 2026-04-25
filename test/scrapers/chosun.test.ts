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
			expect(articles[0].summary).toBe("요약 내용");
		});

		it("extracts summary from description.basic (story-feed field)", () => {
			// story-feed API provides description.basic; story-feed-sections (old broken endpoint) did not
			const json = {
				content_elements: [
					{
						headlines: { basic: "엔드포인트 확인 사설" },
						canonical_url: "/opinion/editorial/2026/04/25/TESTID/",
						description: { basic: "엔드포인트 회귀 테스트용 요약문" },
						display_date: "2026-04-25T09:00:00Z",
					},
				],
			};
			const articles = scraper.parseApi(json);
			expect(articles).toHaveLength(1);
			expect(articles[0].summary).toBe("엔드포인트 회귀 테스트용 요약문");
		});

		it("filters out non-editorial opinion urls", () => {
			const json = {
				content_elements: [
					{
						headlines: { basic: "칼럼 기사" },
						canonical_url: "/opinion/column/2026/04/25/abc",
						description: { basic: "칼럼 설명" },
					},
					{
						headlines: { basic: "사설" },
						canonical_url: "/opinion/editorial/2026/04/25/xyz",
						description: { basic: "사설 설명" },
					},
				],
			};
			const articles = scraper.parseApi(json);
			// Only editorial URL should pass
			expect(articles).toHaveLength(1);
			expect(articles[0].url).toContain("/opinion/editorial/");
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

		it("extracts summary from Fusion.contentCache HTML", () => {
			// Minimal but structurally accurate fixture: contentCache is nested as
			// { "story-feed": { "<query-key>": { data: { content_elements: [...] } } } }
			const cacheValue = {
				"story-feed": {
					'{"includeSections":"/opinion/editorial","size":20}': {
						data: {
							content_elements: [
								{
									headlines: { basic: "사설: 경제 위기 대응" },
									canonical_url: "/opinion/editorial/2026/04/25/ABCDEF/",
									description: {
										basic: "정부가 경제 위기에 대응하기 위한 새로운 정책을 발표했다.",
									},
									display_date: "2026-04-25T00:00:00Z",
									promo_items: { basic: { url: "https://img.chosun.com/photo.jpg" } },
								},
							],
						},
					},
				},
			};
			const html = `<html><head></head><body><script>Fusion.contentCache=${JSON.stringify(cacheValue)};Fusion.layout="foo";</script></body></html>`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].title).toBe("사설: 경제 위기 대응");
			expect(articles[0].summary).toBe("정부가 경제 위기에 대응하기 위한 새로운 정책을 발표했다.");
			expect(articles[0].url).toContain("chosun.com/opinion/editorial/");
		});

		it("ignores non-editorial entries in Fusion.contentCache", () => {
			const cacheValue = {
				"story-feed": {
					"{}": {
						data: {
							content_elements: [
								{
									headlines: { basic: "칼럼 기사" },
									canonical_url: "/opinion/column/2026/04/25/XYZ/",
									description: { basic: "칼럼 설명" },
									display_date: "2026-04-25T00:00:00Z",
								},
								{
									headlines: { basic: "사설 기사" },
									canonical_url: "/opinion/editorial/2026/04/25/ZZZ/",
									description: { basic: "사설 설명" },
									display_date: "2026-04-25T00:00:00Z",
								},
							],
						},
					},
				},
			};
			const html = `<html><body><script>Fusion.contentCache=${JSON.stringify(cacheValue)};Fusion.layout="x";</script></body></html>`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].url).toContain("/opinion/editorial/");
		});
	});
});
