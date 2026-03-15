import { memo } from "react";
import { getDateLabel } from "../lib/date";
import type { Article } from "../lib/types";
import { ArticleCard } from "./ArticleCard";

interface DateGroupProps {
	dateKey: string;
	articles: Article[];
	bookmarkIds: Set<number>;
	onToggleBookmark: (id: number) => void;
}

export const DateGroup = memo(
	function DateGroup({ dateKey, articles, bookmarkIds, onToggleBookmark }: DateGroupProps) {
		return (
			<>
				<div className="date-group-header">{getDateLabel(dateKey)}</div>
				{articles.map((a) => (
					<ArticleCard
						key={a.id}
						article={a}
						isBookmarked={bookmarkIds.has(a.id)}
						onToggleBookmark={onToggleBookmark}
					/>
				))}
			</>
		);
	},
	(prev, next) => {
		if (prev.dateKey !== next.dateKey) return false;
		if (prev.articles !== next.articles) return false;
		if (prev.onToggleBookmark !== next.onToggleBookmark) return false;
		if (prev.bookmarkIds === next.bookmarkIds) return true;
		for (const a of prev.articles) {
			if (prev.bookmarkIds.has(a.id) !== next.bookmarkIds.has(a.id)) return false;
		}
		return true;
	},
);
