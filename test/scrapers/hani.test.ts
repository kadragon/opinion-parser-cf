import { describe, expect, it } from "vitest";
import { HaniScraper } from "../../src/scrapers/hani";

describe("HaniScraper", () => {
	const scraper = new HaniScraper();

	it("has correct newspaper name", () => {
		expect(scraper.name).toBe("한겨레");
	});

	describe("parse", () => {
		it("parses articles from __NEXT_DATA__ with articleList", () => {
			const html = `
				<html><body>
				<script id="__NEXT_DATA__" type="application/json">
				{
					"props": {
						"pageProps": {
							"listData": {
								"articleList": [
									{
										"id": 12345,
										"title": "사설 제목 1",
										"subtitle": "요약 내용",
										"createDate": "2026-03-14 09:00",
										"thumbnail": "https://img.hani.co.kr/test.jpg",
										"url": "/arti/opinion/editorial/12345.html"
									},
									{
										"id": 67890,
										"title": "사설 제목 2",
										"subtitle": "두 번째 요약",
										"createDate": "2026-03-14 10:00",
										"thumbnail": "https://img.hani.co.kr/test2.jpg",
										"article_url": "https://www.hani.co.kr/arti/opinion/editorial/67890.html"
									}
								]
							}
						}
					}
				}
				</script>
				</body></html>
			`;

			const articles = scraper.parse(html);
			expect(articles).toHaveLength(2);
			expect(articles[0].newspaper).toBe("한겨레");
			expect(articles[0].title).toBe("사설 제목 1");
			expect(articles[0].url).toContain("hani.co.kr");
			expect(articles[0].summary).toBe("요약 내용");
			expect(articles[0].image_url).toBe("https://img.hani.co.kr/test.jpg");
			expect(articles[1].title).toBe("사설 제목 2");
		});

		it("falls back to anchor parsing when __NEXT_DATA__ has no articleList", () => {
			const html = `
				<html><body>
				<script id="__NEXT_DATA__" type="application/json">
				{"props": {"pageProps": {"otherData": {}}}}
				</script>
				<a href="/arti/opinion/editorial/11111.html">사설: 앵커 기사</a>
				</body></html>
			`;

			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].title).toBe("사설: 앵커 기사");
			expect(articles[0].url).toBe("https://www.hani.co.kr/arti/opinion/editorial/11111.html");
		});

		it("falls back to anchor parsing when __NEXT_DATA__ is empty", () => {
			const html = `
				<html><body>
				<script id="__NEXT_DATA__" type="application/json">{}</script>
				<a href="/arti/opinion/editorial/22222.html">사설: 빈 데이터</a>
				</body></html>
			`;

			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].title).toBe("사설: 빈 데이터");
			expect(articles[0].url).toContain("hani.co.kr");
		});

		it("extracts articles from anchor tags with editorial links", () => {
			const html = `
				<div>
					<a href="/arti/opinion/editorial/33333.html">사설: 경제 성장</a>
					<a href="/arti/opinion/editorial/44444.html">사설: 교육 정책</a>
				</div>
			`;

			const articles = scraper.parse(html);
			expect(articles).toHaveLength(2);
			expect(articles[0].url).toBe("https://www.hani.co.kr/arti/opinion/editorial/33333.html");
			expect(articles[1].url).toBe("https://www.hani.co.kr/arti/opinion/editorial/44444.html");
			expect(articles[0].newspaper).toBe("한겨레");
		});

		it("returns empty for HTML with no editorial links", () => {
			const html = "<html><body>Hello</body></html>";
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(0);
		});

		it("skips __NEXT_DATA__ articles without title", () => {
			const html = `
				<html><body>
				<script id="__NEXT_DATA__" type="application/json">
				{
					"props": {
						"pageProps": {
							"listData": {
								"articleList": [
									{
										"id": 11111,
										"title": "유효한 제목",
										"url": "/arti/opinion/editorial/11111.html"
									},
									{
										"id": 22222,
										"title": "",
										"url": "/arti/opinion/editorial/22222.html"
									},
									{
										"id": 33333,
										"url": "/arti/opinion/editorial/33333.html"
									}
								]
							}
						}
					}
				}
				</script>
				</body></html>
			`;

			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].title).toBe("유효한 제목");
		});

		it("resolves relative URLs to absolute URLs from __NEXT_DATA__", () => {
			const html = `
				<html><body>
				<script id="__NEXT_DATA__" type="application/json">
				{
					"props": {
						"pageProps": {
							"listData": {
								"articleList": [
									{
										"id": 55555,
										"title": "상대 경로 기사",
										"url": "/arti/opinion/editorial/55555.html"
									}
								]
							}
						}
					}
				}
				</script>
				</body></html>
			`;

			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].url).toBe("https://www.hani.co.kr/arti/opinion/editorial/55555.html");
		});
	});
});
