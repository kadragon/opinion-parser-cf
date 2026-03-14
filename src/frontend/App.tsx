import { useCallback, useMemo, useState } from "react";
import { ArticleList } from "./components/ArticleList";
import { FilterBar } from "./components/FilterBar";
import { Header } from "./components/Header";
import { useAppContext } from "./context/AppContext";
import { useArticles } from "./hooks/useArticles";
import { useBookmarks } from "./hooks/useBookmarks";
import type { Filters } from "./lib/types";

function AppContent() {
	const { clientToken, theme, toggleTheme } = useAppContext();
	const [filters, setFilters] = useState<Filters>({ newspaper: "", q: "", date: "" });
	const [showBookmarks, setShowBookmarks] = useState(false);

	const { articles, loading, hasMore, error, loadMore } = useArticles(filters, clientToken);
	const { bookmarkIds, toggleBookmark } = useBookmarks(clientToken);

	const handleToggleBookmarks = useCallback(() => {
		setShowBookmarks((prev) => !prev);
	}, []);

	const displayedArticles = useMemo(() => {
		if (showBookmarks) {
			return articles.filter((a) => bookmarkIds.has(a.id));
		}
		return articles;
	}, [articles, bookmarkIds, showBookmarks]);

	return (
		<>
			<a href="#main-content" className="skip-link">
				본문으로 건너뛰기
			</a>
			<Header
				articleCount={displayedArticles.length}
				showBookmarks={showBookmarks}
				onToggleBookmarks={handleToggleBookmarks}
				theme={theme}
				onToggleTheme={toggleTheme}
			/>
			<FilterBar filters={filters} onFilterChange={setFilters} />
			<main className="content" id="main-content" aria-live="polite">
				<ArticleList
					articles={displayedArticles}
					loading={loading}
					hasMore={hasMore}
					error={error}
					showBookmarks={showBookmarks}
					bookmarkIds={bookmarkIds}
					onToggleBookmark={toggleBookmark}
					onLoadMore={loadMore}
				/>
			</main>
		</>
	);
}

export function App() {
	return <AppContent />;
}
