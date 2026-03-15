import { useMemo } from "react";
import { groupByDate } from "../lib/date";
import type { Article } from "../lib/types";
import { DateGroup } from "./DateGroup";
import { EmptyState } from "./EmptyState";
import { LoadMoreButton } from "./LoadMoreButton";
import { LoadingSpinner } from "./LoadingSpinner";

interface ArticleListProps {
	articles: Article[];
	loading: boolean;
	hasMore: boolean;
	error: boolean;
	showBookmarks: boolean;
	bookmarkIds: Set<number>;
	onToggleBookmark: (id: number) => void;
	onLoadMore: () => void;
}

export function ArticleList({
	articles,
	loading,
	hasMore,
	error,
	showBookmarks,
	bookmarkIds,
	onToggleBookmark,
	onLoadMore,
}: ArticleListProps) {
	if (loading && articles.length === 0) {
		return <LoadingSpinner />;
	}

	if (error && articles.length === 0) {
		return (
			<p className="error-message">기사를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.</p>
		);
	}

	if (articles.length === 0) {
		return <EmptyState showBookmarks={showBookmarks} />;
	}

	const groups = useMemo(() => groupByDate(articles), [articles]);

	return (
		<>
			{groups.map((g) => (
				<DateGroup
					key={g.key}
					dateKey={g.key}
					articles={g.items}
					bookmarkIds={bookmarkIds}
					onToggleBookmark={onToggleBookmark}
				/>
			))}
			{!showBookmarks && hasMore && <LoadMoreButton loading={loading} onClick={onLoadMore} />}
		</>
	);
}
