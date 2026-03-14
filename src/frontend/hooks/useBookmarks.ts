import { useCallback, useEffect, useState } from "react";
import { fetchBookmarks, toggleBookmarkApi } from "../lib/api";

export function useBookmarks(clientToken: string) {
	const [bookmarkIds, setBookmarkIds] = useState<Set<number>>(new Set());

	useEffect(() => {
		fetchBookmarks(clientToken).then((items) => {
			const ids = items.map((b) => b.articleId || b.id || 0).filter(Boolean);
			setBookmarkIds(new Set(ids));
		});
	}, [clientToken]);

	const toggleBookmark = useCallback(
		(articleId: number) => {
			setBookmarkIds((prev) => {
				const next = new Set(prev);
				if (next.has(articleId)) {
					next.delete(articleId);
				} else {
					next.add(articleId);
				}
				return next;
			});

			toggleBookmarkApi(articleId, clientToken).catch(() => {
				setBookmarkIds((prev) => {
					const rollback = new Set(prev);
					if (rollback.has(articleId)) {
						rollback.delete(articleId);
					} else {
						rollback.add(articleId);
					}
					return rollback;
				});
			});
		},
		[clientToken],
	);

	return { bookmarkIds, toggleBookmark };
}
