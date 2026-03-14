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
	showBookmarks: boolean;
	bookmarkIds: Set<number>;
	onToggleBookmark: (id: number) => void;
	onLoadMore: () => void;
}

export function ArticleList({
	articles,
	loading,
	hasMore,
	showBookmarks,
	bookmarkIds,
	onToggleBookmark,
	onLoadMore,
}: ArticleListProps) {
	const displayed = showBookmarks ? articles.filter((a) => bookmarkIds.has(a.id)) : articles;

	if (loading && displayed.length === 0) {
		return <LoadingSpinner />;
	}

	if (displayed.length === 0) {
		return <EmptyState showBookmarks={showBookmarks} />;
	}

	const groups = groupByDate(displayed);

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
