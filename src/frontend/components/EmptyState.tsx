interface EmptyStateProps {
	showBookmarks: boolean;
}

export function EmptyState({ showBookmarks }: EmptyStateProps) {
	return (
		<div className="empty-state">
			<div className="empty-state-icon">{showBookmarks ? "\uD83D\uDD16" : "\uD83D\uDCF0"}</div>
			<div className="empty-state-title">
				{showBookmarks ? "저장된 북마크가 없습니다" : "기사를 찾을 수 없습니다"}
			</div>
			<div className="empty-state-desc">
				{showBookmarks ? "관심 있는 사설을 북마크해 보세요" : "다른 검색어나 필터를 시도해 보세요"}
			</div>
		</div>
	);
}
