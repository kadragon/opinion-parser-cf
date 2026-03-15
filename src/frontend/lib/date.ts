interface KstParts {
	y: number;
	m: number;
	d: number;
	h: number;
	min: number;
}

function toKst(d: Date): KstParts {
	const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
	return {
		y: kst.getUTCFullYear(),
		m: kst.getUTCMonth() + 1,
		d: kst.getUTCDate(),
		h: kst.getUTCHours(),
		min: kst.getUTCMinutes(),
	};
}

export function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	const k = toKst(d);
	return `${k.m}/${k.d} ${String(k.h).padStart(2, "0")}:${String(k.min).padStart(2, "0")}`;
}

export function getDateKey(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	const k = toKst(d);
	return `${k.y}-${String(k.m).padStart(2, "0")}-${String(k.d).padStart(2, "0")}`;
}

export function getDateLabel(dateKey: string): string {
	const now = new Date();
	const t = toKst(now);
	const todayKey = `${t.y}-${String(t.m).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`;

	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const y = toKst(yesterday);
	const yesterdayKey = `${y.y}-${String(y.m).padStart(2, "0")}-${String(y.d).padStart(2, "0")}`;

	if (dateKey === todayKey) return "오늘";
	if (dateKey === yesterdayKey) return "어제";

	const parts = dateKey.split("-");
	const year = Number.parseInt(parts[0]);
	const month = Number.parseInt(parts[1]);
	const day = Number.parseInt(parts[2]);
	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return dateKey;
	return `${year}년 ${month}월 ${day}일`;
}

export function formatTime(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return "";
	const k = toKst(d);
	return `${String(k.h).padStart(2, "0")}:${String(k.min).padStart(2, "0")}`;
}

export function groupByDate<
	T extends { publishedAt?: string; published_at?: string; date?: string; createdAt?: string },
>(articles: T[]): { key: string; items: T[] }[] {
	const groups: Record<string, T[]> = {};
	const order: string[] = [];

	for (const a of articles) {
		const key = getDateKey(a.publishedAt || a.published_at || a.date || a.createdAt || "");
		if (!groups[key]) {
			groups[key] = [];
			order.push(key);
		}
		groups[key].push(a);
	}

	return order.map((key) => ({ key, items: groups[key] }));
}
