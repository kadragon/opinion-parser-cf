import { newspapers } from "../newspapers/registry";
import { fetchWithRetry } from "../scrapers/base";
import type { ArticleContentParser, ParsedArticle } from "./types";

function findParser(url: string): ArticleContentParser | null {
	try {
		const hostname = new URL(url).hostname;
		const parser = newspapers
			.map((n) => n.contentParser)
			.find((p) => hostname === p.domain || hostname.endsWith(`.${p.domain}`));
		return parser ?? null;
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
