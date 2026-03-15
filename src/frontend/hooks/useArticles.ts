import { useCallback, useEffect, useRef, useState } from "react";
import { fetchArticles } from "../lib/api";
import type { Article, Filters } from "../lib/types";

const PAGE_SIZE = 15;

export function useArticles(filters: Filters, clientToken: string) {
	const [articles, setArticles] = useState<Article[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState(false);
	const pageRef = useRef(1);
	const abortRef = useRef<AbortController | null>(null);

	const load = useCallback(
		(page: number, append: boolean) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setLoading(true);
			setError(false);
			if (!append) setArticles([]);

			fetchArticles(
				{
					newspaper: filters.newspaper || undefined,
					date: filters.date || undefined,
					q: filters.q || undefined,
					page,
					pageSize: PAGE_SIZE,
				},
				clientToken,
				controller.signal,
			)
				.then((data) => {
					const newArticles = data.data || [];
					setArticles((prev) => (append ? [...prev, ...newArticles] : newArticles));
					setHasMore(newArticles.length >= PAGE_SIZE);
					pageRef.current = page + 1;
					setLoading(false);
				})
				.catch((e) => {
					if (e instanceof DOMException && e.name === "AbortError") {
						return;
					}
					console.error("Failed to load articles:", e);
					setLoading(false);
					setError(true);
				});
		},
		[filters.newspaper, filters.date, filters.q, clientToken],
	);

	useEffect(() => {
		pageRef.current = 1;
		load(1, false);
		return () => abortRef.current?.abort();
	}, [load]);

	const loadMore = useCallback(() => {
		load(pageRef.current, true);
	}, [load]);

	return { articles, loading, hasMore, error, loadMore };
}
