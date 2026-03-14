import { describe, expect, it } from "vitest";
import { DongaScraper } from "../../src/scrapers/donga";

const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>동아일보 사설</title>
    <item>
      <title><![CDATA[[사설] 경제 위기 대응, 정부의 역할이 중요하다]]></title>
      <link>https://www.donga.com/news/article/all/20260314/001</link>
      <description><![CDATA[경제 위기 상황에서 정부의 적극적인 대응이 필요하다는 내용의 사설입니다.]]></description>
      <pubDate>Fri, 14 Mar 2026 00:00:00 +0900</pubDate>
    </item>
    <item>
      <title><![CDATA[스포츠 소식]]></title>
      <link>https://www.donga.com/news/article/all/20260314/002</link>
      <description><![CDATA[스포츠 관련 기사]]></description>
      <pubDate>Fri, 14 Mar 2026 00:00:00 +0900</pubDate>
    </item>
    <item>
      <title><![CDATA[[사설] 교육 개혁의 방향]]></title>
      <link>https://www.donga.com/news/article/all/20260314/003</link>
      <description><![CDATA[교육 개혁에 대한 논의]]></description>
      <pubDate>Thu, 13 Mar 2026 00:00:00 +0900</pubDate>
    </item>
  </channel>
</rss>`;

describe("DongaScraper", () => {
	const scraper = new DongaScraper();

	it("has correct newspaper name", () => {
		expect(scraper.name).toBe("동아일보");
	});

	it("parses RSS XML and filters [사설] items only", () => {
		const articles = scraper.parse(sampleRss);
		expect(articles).toHaveLength(2);
	});

	it("strips [사설] prefix from title", () => {
		const articles = scraper.parse(sampleRss);
		expect(articles[0].title).toBe("경제 위기 대응, 정부의 역할이 중요하다");
	});

	it("extracts URL correctly", () => {
		const articles = scraper.parse(sampleRss);
		expect(articles[0].url).toBe("https://www.donga.com/news/article/all/20260314/001");
	});

	it("extracts summary from description", () => {
		const articles = scraper.parse(sampleRss);
		expect(articles[0].summary).toContain("경제 위기");
	});

	it("sets newspaper field", () => {
		const articles = scraper.parse(sampleRss);
		expect(articles[0].newspaper).toBe("동아일보");
	});

	it("parses published_at as ISO date", () => {
		const articles = scraper.parse(sampleRss);
		expect(articles[0].published_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("returns empty array for empty RSS", () => {
		const articles = scraper.parse("<rss><channel></channel></rss>");
		expect(articles).toHaveLength(0);
	});
});
