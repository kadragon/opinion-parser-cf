import { describe, expect, it } from "vitest";
import { KhanScraper } from "../../src/scrapers/khan";

const sampleHtml = `
<ul id="recentList">
	<li>
		<article>
			<picture>
				<img src="https://img.khan.co.kr/news/test.jpg" alt="[사설] 테스트 사설 제목" loading="lazy">
			</picture>
			<div>
				<a href="https://www.khan.co.kr/article/202603131804001" title="[사설] 테스트 사설 제목">[사설] 테스트 사설 제목</a>
				<p class="desc">사설 내용 요약입니다. 이것은 테스트 데이터입니다.</p>
				<p class="date">2026.03.13 18:04</p>
			</div>
		</article>
	</li>
	<li>
		<article>
			<picture>
				<img src="https://img.khan.co.kr/news/test2.jpg" alt="[사설] 두번째 사설" loading="lazy">
			</picture>
			<div>
				<a href="https://www.khan.co.kr/article/202603121854011" title="[사설] 두번째 사설">[사설] 두번째 사설</a>
				<p class="desc">두번째 사설의 요약 내용입니다.</p>
				<p class="date">2026.03.12 18:54</p>
			</div>
		</article>
	</li>
</ul>`;

describe("KhanScraper", () => {
	const scraper = new KhanScraper();

	it("has correct newspaper name", () => {
		expect(scraper.name).toBe("경향신문");
	});

	it("parses articles from HTML", () => {
		const articles = scraper.parse(sampleHtml);
		expect(articles).toHaveLength(2);
	});

	it("strips [사설] prefix from title", () => {
		const articles = scraper.parse(sampleHtml);
		expect(articles[0].title).toBe("테스트 사설 제목");
	});

	it("extracts absolute URL", () => {
		const articles = scraper.parse(sampleHtml);
		expect(articles[0].url).toBe("https://www.khan.co.kr/article/202603131804001");
	});

	it("extracts summary from desc", () => {
		const articles = scraper.parse(sampleHtml);
		expect(articles[0].summary).toContain("사설 내용 요약");
	});

	it("parses date correctly", () => {
		const articles = scraper.parse(sampleHtml);
		expect(articles[0].published_at).toMatch(/2026-03-13/);
	});

	it("extracts image URL", () => {
		const articles = scraper.parse(sampleHtml);
		expect(articles[0].image_url).toBe("https://img.khan.co.kr/news/test.jpg");
	});

	it("returns empty for HTML without articles", () => {
		const articles = scraper.parse("<html><body>No articles</body></html>");
		expect(articles).toHaveLength(0);
	});
});
