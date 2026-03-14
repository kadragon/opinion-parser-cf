const DEFAULT_HEADERS: Record<string, string> = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

export async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	maxRetries = 2,
): Promise<Response> {
	const mergedOptions: RequestInit = {
		...options,
		headers: {
			...DEFAULT_HEADERS,
			...options.headers,
		},
	};

	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, mergedOptions);
			if (response.ok) {
				return response;
			}
			lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
		}

		if (attempt < maxRetries) {
			await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
		}
	}

	throw lastError ?? new Error(`Failed to fetch ${url}`);
}

export function todayDateString(): string {
	return toKstIso(new Date());
}

/**
 * 날짜 문자열을 KST ISO 8601 형식으로 변환한다.
 * 타임존 정보가 없는 문자열(예: "2026-03-14 00:34", "2026.03.14 00:34")은 KST로 간주한다.
 */
export function parseDate(dateStr: string): string {
	// "2026.03.14 00:34" or "2026-03-14 00:34" (no timezone → KST)
	const localMatch = dateStr.match(
		/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
	);
	if (localMatch) {
		const [, y, m, d, h, min, sec] = localMatch;
		return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${sec ?? "00"}+09:00`;
	}

	// "2026-03-14" (date only → KST midnight)
	const dateOnlyMatch = dateStr.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
	if (dateOnlyMatch) {
		const [, y, m, d] = dateOnlyMatch;
		return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00+09:00`;
	}

	// RFC 2822 or ISO with timezone — parse normally then format as KST
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) {
		return toKstIso(new Date());
	}
	return toKstIso(date);
}

/** Date 객체를 KST ISO 8601 문자열로 변환 */
export function toKstIso(date: Date): string {
	const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
	const y = kst.getUTCFullYear();
	const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
	const d = String(kst.getUTCDate()).padStart(2, "0");
	const h = String(kst.getUTCHours()).padStart(2, "0");
	const min = String(kst.getUTCMinutes()).padStart(2, "0");
	const sec = String(kst.getUTCSeconds()).padStart(2, "0");
	return `${y}-${m}-${d}T${h}:${min}:${sec}+09:00`;
}
