import { describe, expect, it } from "vitest";
import { JoongangScraper } from "../../src/scrapers/joongang";

describe("JoongangScraper", () => {
	const scraper = new JoongangScraper();

	it("has correct newspaper name", () => {
		expect(scraper.name).toBe("중앙일보");
	});

	describe("parse", () => {
		it("extracts articles from story_list ul with li items", () => {
			const html = `
				<ul class="story_list">
					<li>
						<h2 class="headline"><a href="/article/123">첫 번째 사설</a></h2>
						<p class="ab_summary">요약 내용 1</p>
						<p class="date">2026.03.14 00:34</p>
						<img src="https://img.joongang.co.kr/photo1.jpg" />
					</li>
					<li>
						<h2 class="headline"><a href="/article/456">두 번째 사설</a></h2>
						<p class="ab_summary">요약 내용 2</p>
						<p class="date">2026.03.14 01:00</p>
					</li>
				</ul>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(2);
			expect(articles[0].title).toBe("첫 번째 사설");
			expect(articles[0].newspaper).toBe("중앙일보");
			expect(articles[1].title).toBe("두 번째 사설");
		});

		it("returns empty when story_list exists but no headline match", () => {
			const html = `
				<ul class="story_list">
					<li>
						<p>No headline here</p>
					</li>
				</ul>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(0);
		});

		it("falls back to card divs when story_list has no items", () => {
			const html = `
				<div class="card">
					<a href="/article/789">카드 기사 제목</a>
				</div></div>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].title).toBe("카드 기사 제목");
			expect(articles[0].newspaper).toBe("중앙일보");
		});

		it("returns empty for HTML with no matches", () => {
			const html = "<html><body>Hello</body></html>";
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(0);
		});

		it("resolves relative URLs to absolute", () => {
			const html = `
				<ul class="story_list">
					<li>
						<h2 class="headline"><a href="/article/123">상대 경로 테스트</a></h2>
					</li>
				</ul>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].url).toBe("https://www.joongang.co.kr/article/123");
		});

		it("extracts summary from ab_summary class", () => {
			const html = `
				<ul class="story_list">
					<li>
						<h2 class="headline"><a href="/article/100">제목</a></h2>
						<p class="ab_summary">이것은 요약입니다</p>
					</li>
				</ul>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].summary).toBe("이것은 요약입니다");
		});

		it("extracts date from date class paragraph", () => {
			const html = `
				<ul class="story_list">
					<li>
						<h2 class="headline"><a href="/article/200">제목</a></h2>
						<p class="date">2026.03.14 00:34</p>
					</li>
				</ul>
			`;
			const articles = scraper.parse(html);
			expect(articles).toHaveLength(1);
			expect(articles[0].published_at).toBe("2026-03-14T00:34:00+09:00");
		});
	});
});
