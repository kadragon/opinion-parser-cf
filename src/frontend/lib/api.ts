import type { BookmarkItem, PaginatedResponse } from "./types";

export function fetchArticles(
	params: {
		newspaper?: string;
		date?: string;
		q?: string;
		page: number;
		pageSize: number;
	},
	clientToken: string,
	signal?: AbortSignal,
): Promise<PaginatedResponse> {
	const searchParams = new URLSearchParams();
	if (params.newspaper) searchParams.set("newspaper", params.newspaper);
	if (params.date) searchParams.set("date", params.date);
	if (params.q) searchParams.set("q", params.q);
	searchParams.set("page", String(params.page));
	searchParams.set("pageSize", String(params.pageSize));

	return fetch(`/api/articles?${searchParams.toString()}`, {
		headers: { "X-Client-Token": clientToken },
		signal,
	}).then((res) => {
		if (!res.ok) throw new Error("Failed to fetch articles");
		return res.json() as Promise<PaginatedResponse>;
	});
}

export function fetchBookmarks(clientToken: string): Promise<BookmarkItem[]> {
	return fetch("/api/bookmarks", {
		headers: { "X-Client-Token": clientToken },
	})
		.then((res) => {
			if (!res.ok) return [];
			return res.json();
		})
		.then((data) => {
			if (!data) return [];
			return Array.isArray(data) ? data : data.bookmarks || [];
		});
}

export function toggleBookmarkApi(articleId: number, clientToken: string): Promise<Response> {
	return fetch("/api/bookmarks", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Client-Token": clientToken,
		},
		body: JSON.stringify({ articleId }),
	});
}
