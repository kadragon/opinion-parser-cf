import { describe, expect, it } from "vitest";
import { ChosunContentParser } from "../../src/parsers/chosun";
import { DongaContentParser } from "../../src/parsers/donga";
import { HaniContentParser } from "../../src/parsers/hani";
import { JoongangContentParser } from "../../src/parsers/joongang";
import { KhanContentParser } from "../../src/parsers/khan";

// Minimal HTML wrappers for characterization tests — snapshot current output
// so refactors don't silently change extraction behavior.

const OG_TITLE = (title: string) => `<meta property="og:title" content="${title}">`;
const PUBLISHED_TIME = (dt: string) => `<meta property="article:published_time" content="${dt}">`;
const H1 = (title: string) => `<h1>${title}</h1>`;
const DATE_TEXT = (d: string) => `<span>${d}</span>`;
const PARAGRAPHS = (ps: string[]) => ps.map((p) => `<p>${p}</p>`).join("\n");

// ─────────────────────────────────────────────
// ChosunContentParser
// ─────────────────────────────────────────────
describe("ChosunContentParser", () => {
	const parser = new ChosunContentParser();

	it("has correct domain and newspaper", () => {
		expect(parser.domain).toBe("chosun.com");
		expect(parser.newspaper).toBe("조선일보");
	});

	describe("extractTitle", () => {
		it("extracts from og:title meta", () => {
			const html = `<html><head>${OG_TITLE("사설 제목")}</head><body></body></html>`;
			expect(parser.parse(html).title).toBe("사설 제목");
		});

		it("falls back to h1 when og:title absent", () => {
			const html = `<html><head></head><body>${H1("H1 제목")}</body></html>`;
			expect(parser.parse(html).title).toBe("H1 제목");
		});

		it("returns empty string when no title found", () => {
			expect(parser.parse("<html></html>").title).toBe("");
		});
	});

	describe("extractDate", () => {
		it("extracts from article:published_time meta", () => {
			const html = `<html><head>${PUBLISHED_TIME("2026-03-14T09:00:00+09:00")}</head><body></body></html>`;
			expect(parser.parse(html).publishedAt).toBe("2026-03-14T09:00:00+09:00");
		});

		it("falls back to date text pattern", () => {
			const html = `<html><body>${DATE_TEXT("2026.03.14 09:00")}</body></html>`;
			const result = parser.parse(html);
			expect(result.publishedAt).toMatch(/2026-03-14/);
		});

		it("returns empty string when no date found", () => {
			expect(parser.parse("<html></html>").publishedAt).toBe("");
		});
	});

	describe("extractBody — __NEXT_DATA__ strategy", () => {
		it("extracts from props.pageProps.article.content", () => {
			const data = {
				props: { pageProps: { article: { content: "<p>첫 문단</p><p>두 번째 문단</p>" } } },
			};
			const html = `<html><body><script id="__NEXT_DATA__">${JSON.stringify(data)}</script></body></html>`;
			expect(parser.parse(html).body).toEqual(["첫 문단", "두 번째 문단"]);
		});

		it("extracts from props.pageProps.article.body", () => {
			const data = {
				props: { pageProps: { article: { body: "<p>본문 내용</p>" } } },
			};
			const html = `<html><body><script id="__NEXT_DATA__">${JSON.stringify(data)}</script></body></html>`;
			expect(parser.parse(html).body).toEqual(["본문 내용"]);
		});

		it("extracts from props.pageProps.content when article absent", () => {
			const data = { props: { pageProps: { content: "<p>직접 콘텐츠</p>" } } };
			const html = `<html><body><script id="__NEXT_DATA__">${JSON.stringify(data)}</script></body></html>`;
			expect(parser.parse(html).body).toEqual(["직접 콘텐츠"]);
		});

		it("falls back to article tag when __NEXT_DATA__ yields nothing", () => {
			const data = { props: { pageProps: { article: {} } } };
			const html = `<html><body>
				<script id="__NEXT_DATA__">${JSON.stringify(data)}</script>
				<article><p>기사 본문</p></article>
			</body></html>`;
			expect(parser.parse(html).body).toEqual(["기사 본문"]);
		});

		it("falls back to article tag when __NEXT_DATA__ JSON is invalid", () => {
			const html = `<html><body>
				<script id="__NEXT_DATA__">{ invalid json</script>
				<article><p>폴백 본문</p></article>
			</body></html>`;
			expect(parser.parse(html).body).toEqual(["폴백 본문"]);
		});
	});

	describe("extractBody — Fusion.globalContent strategy (Arc SPA)", () => {
		it("extracts text elements from Fusion.globalContent content_elements", () => {
			const globalContent = {
				_id: "TEST123",
				content_elements: [
					{ type: "text", content: "첫 문단 텍스트" },
					{ type: "image", url: "img.jpg" },
					{ type: "text", content: "<b>둘째</b> 문단" },
					{ type: "text", content: "" },
				],
			};
			const html = `<html>
				<head>
					${OG_TITLE("테스트 사설")}
					${PUBLISHED_TIME("2026-06-13T15:00:00+09:00")}
				</head>
				<body>
					<script>Fusion.globalContent=${JSON.stringify(globalContent)};</script>
				</body>
			</html>`;
			const result = parser.parse(html);
			expect(result.title).toBe("테스트 사설");
			expect(result.publishedAt).toBe("2026-06-13T15:00:00+09:00");
			expect(result.body).toEqual(["첫 문단 텍스트", "둘째 문단"]);
		});

		it("falls back when globalContent absent (uses __NEXT_DATA__)", () => {
			const data = {
				props: { pageProps: { article: { content: "<p>넥스트 데이터 본문</p>" } } },
			};
			const html = `<html><body><script id="__NEXT_DATA__">${JSON.stringify(data)}</script></body></html>`;
			expect(parser.parse(html).body).toEqual(["넥스트 데이터 본문"]);
		});
	});

	describe("extractBody — article fallback", () => {
		it("extracts p tags from article element", () => {
			const html = `<html><body>
				<article>${PARAGRAPHS(["첫째 단락", "둘째 단락"])}</article>
			</body></html>`;
			expect(parser.parse(html).body).toEqual(["첫째 단락", "둘째 단락"]);
		});

		it("skips empty p tags", () => {
			const html = `<html><body><article><p></p><p>내용</p><p>  </p></article></body></html>`;
			expect(parser.parse(html).body).toEqual(["내용"]);
		});
	});
});

// ─────────────────────────────────────────────
// DongaContentParser
// ─────────────────────────────────────────────
describe("DongaContentParser", () => {
	const parser = new DongaContentParser();

	it("has correct domain and newspaper", () => {
		expect(parser.domain).toBe("donga.com");
		expect(parser.newspaper).toBe("동아일보");
	});

	describe("extractTitle", () => {
		it("extracts from og:title meta", () => {
			const html = `<html><head>${OG_TITLE("동아 사설")}</head><body></body></html>`;
			expect(parser.parse(html).title).toBe("동아 사설");
		});

		it("falls back to h1", () => {
			const html = `<html><head></head><body>${H1("동아 H1")}</body></html>`;
			expect(parser.parse(html).title).toBe("동아 H1");
		});
	});

	describe("extractDate", () => {
		it("extracts from article:published_time meta", () => {
			const html = `<html><head>${PUBLISHED_TIME("2026-05-01T08:00:00+09:00")}</head><body></body></html>`;
			expect(parser.parse(html).publishedAt).toBe("2026-05-01T08:00:00+09:00");
		});
	});

	describe("extractBody — main_view/news_view strategy", () => {
		it("extracts from main_view container with boundary sentinel", () => {
			const html = `<html><body>
				<div class="main_view"><p>동아 첫 단락</p><p>동아 둘째 단락</p></div>
				<div class="relate_area">관련 기사</div>
			</body></html>`;
			const body = parser.parse(html).body;
			expect(body).toContain("동아 첫 단락");
			expect(body).toContain("동아 둘째 단락");
		});

		it("extracts from news_view container", () => {
			const html = `<html><body>
				<div class="news_view"><p>뉴스 본문</p></div>
			</body></html>`;
			expect(parser.parse(html).body).toContain("뉴스 본문");
		});

		it("falls back to article tag when no view class", () => {
			const html = `<html><body>
				<article><p>기사 태그 본문</p></article>
			</body></html>`;
			expect(parser.parse(html).body).toContain("기사 태그 본문");
		});

		it("falls back to raw html p-tags as last resort", () => {
			const html = `<html><body><p>마지막 수단</p></body></html>`;
			expect(parser.parse(html).body).toContain("마지막 수단");
		});
	});
});

// ─────────────────────────────────────────────
// HaniContentParser
// ─────────────────────────────────────────────
describe("HaniContentParser", () => {
	const parser = new HaniContentParser();

	it("has correct domain and newspaper", () => {
		expect(parser.domain).toBe("hani.co.kr");
		expect(parser.newspaper).toBe("한겨레");
	});

	describe("extractTitle", () => {
		it("extracts from og:title meta", () => {
			const html = `<html><head>${OG_TITLE("한겨레 사설")}</head><body></body></html>`;
			expect(parser.parse(html).title).toBe("한겨레 사설");
		});
	});

	describe("extractDate", () => {
		it("extracts from article:published_time meta", () => {
			const html = `<html><head>${PUBLISHED_TIME("2026-04-10T09:00:00+09:00")}</head><body></body></html>`;
			expect(parser.parse(html).publishedAt).toBe("2026-04-10T09:00:00+09:00");
		});
	});

	describe("extractBody — __NEXT_DATA__ strategy (same as Chosun)", () => {
		it("extracts from props.pageProps.article.content", () => {
			const data = {
				props: { pageProps: { article: { content: "<p>한겨레 본문</p>" } } },
			};
			const html = `<html><body><script id="__NEXT_DATA__">${JSON.stringify(data)}</script></body></html>`;
			expect(parser.parse(html).body).toEqual(["한겨레 본문"]);
		});

		it("falls back to article tag when __NEXT_DATA__ yields nothing", () => {
			const data = { props: { pageProps: {} } };
			const html = `<html><body>
				<script id="__NEXT_DATA__">${JSON.stringify(data)}</script>
				<article><p>폴백 한겨레 본문</p></article>
			</body></html>`;
			expect(parser.parse(html).body).toEqual(["폴백 한겨레 본문"]);
		});
	});
});

// ─────────────────────────────────────────────
// JoongangContentParser
// ─────────────────────────────────────────────
describe("JoongangContentParser", () => {
	const parser = new JoongangContentParser();

	it("has correct domain and newspaper", () => {
		expect(parser.domain).toBe("joongang.co.kr");
		expect(parser.newspaper).toBe("중앙일보");
	});

	describe("extractTitle", () => {
		it("extracts from og:title meta", () => {
			const html = `<html><head>${OG_TITLE("중앙 사설")}</head><body></body></html>`;
			expect(parser.parse(html).title).toBe("중앙 사설");
		});
	});

	describe("extractDate", () => {
		it("extracts from article:published_time meta", () => {
			const html = `<html><head>${PUBLISHED_TIME("2026-03-20T07:00:00+09:00")}</head><body></body></html>`;
			expect(parser.parse(html).publishedAt).toBe("2026-03-20T07:00:00+09:00");
		});
	});

	describe("extractBody", () => {
		it("extracts from article tag", () => {
			const html = `<html><body>
				<article><p>중앙 본문</p><p>두 번째 단락</p></article>
			</body></html>`;
			expect(parser.parse(html).body).toEqual(["중앙 본문", "두 번째 단락"]);
		});

		it("falls back to #article_body div", () => {
			const html = `<html><body>
				<div id="article_body"><p>id 기반 본문</p></div>
			</body></html>`;
			expect(parser.parse(html).body).toContain("id 기반 본문");
		});

		it("falls back to .article_body div", () => {
			const html = `<html><body>
				<div class="article_body"><p>class 기반 본문</p></div>
			</body></html>`;
			expect(parser.parse(html).body).toContain("class 기반 본문");
		});

		it("falls back to raw p tags as last resort", () => {
			const html = `<html><body><p>최후 수단</p></body></html>`;
			expect(parser.parse(html).body).toContain("최후 수단");
		});
	});
});

// ─────────────────────────────────────────────
// KhanContentParser
// ─────────────────────────────────────────────
describe("KhanContentParser", () => {
	const parser = new KhanContentParser();

	it("has correct domain and newspaper", () => {
		expect(parser.domain).toBe("khan.co.kr");
		expect(parser.newspaper).toBe("경향신문");
	});

	describe("extractTitle", () => {
		it("extracts from og:title meta", () => {
			const html = `<html><head>${OG_TITLE("경향 사설")}</head><body></body></html>`;
			expect(parser.parse(html).title).toBe("경향 사설");
		});
	});

	describe("extractDate", () => {
		it("extracts from article:published_time meta", () => {
			const html = `<html><head>${PUBLISHED_TIME("2026-05-10T06:00:00+09:00")}</head><body></body></html>`;
			expect(parser.parse(html).publishedAt).toBe("2026-05-10T06:00:00+09:00");
		});
	});

	describe("extractBody", () => {
		it("extracts from #readingPoint div", () => {
			const html = `<html><body>
				<div id="readingPoint"><p>경향 첫 단락</p><p>경향 둘째 단락</p></div>
			</body></html>`;
			expect(parser.parse(html).body).toEqual(["경향 첫 단락", "경향 둘째 단락"]);
		});

		it("falls back to .article-body div", () => {
			const html = `<html><body>
				<div class="article-body"><p>article-body 본문</p></div>
			</body></html>`;
			expect(parser.parse(html).body).toContain("article-body 본문");
		});

		it("falls back to .article_body div", () => {
			const html = `<html><body>
				<div class="article_body"><p>article_body 본문</p></div>
			</body></html>`;
			expect(parser.parse(html).body).toContain("article_body 본문");
		});

		it("falls back to article tag", () => {
			const html = `<html><body>
				<article><p>article 태그 본문</p></article>
			</body></html>`;
			expect(parser.parse(html).body).toContain("article 태그 본문");
		});

		it("falls back to raw p tags as last resort", () => {
			const html = `<html><body><p>경향 최후 수단</p></body></html>`;
			expect(parser.parse(html).body).toContain("경향 최후 수단");
		});
	});
});
