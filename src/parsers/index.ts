import { fetchWithRetry } from "../scrapers/base";
import { ChosunContentParser } from "./chosun";
import { DongaContentParser } from "./donga";
import { HaniContentParser } from "./hani";
import { JoongangContentParser } from "./joongang";
import { KhanContentParser } from "./khan";
import type { ArticleContentParser, ParsedArticle } from "./types";

const parsers: ArticleContentParser[] = [
	new ChosunContentParser(),
	new DongaContentParser(),
	new HaniContentParser(),
	new JoongangContentParser(),
	new KhanContentParser(),
];

function findParser(url: string): ArticleContentParser | null {
	try {
		const hostname = new URL(url).hostname;
		return parsers.find((p) => hostname === p.domain || hostname.endsWith(`.${p.domain}`)) ?? null;
	} catch {
		return null;
	}
}

export async function parseArticleContent(url: string): Promise<ParsedArticle> {
	const parser = findParser(url);
	if (!parser) {
		throw new Error("지원하지 않는 신문사입니다.");
	}

	const response = await fetchWithRetry(url);
	const html = await response.text();
	const result = parser.parse(html);

	if (result.body.length === 0) {
		throw new Error("본문을 추출할 수 없습니다.");
	}

	return result;
}
