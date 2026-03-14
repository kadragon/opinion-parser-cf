interface HeaderProps {
	articleCount: number;
	showBookmarks: boolean;
	onToggleBookmarks: () => void;
	theme: "light" | "dark";
	onToggleTheme: () => void;
}

function SunIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="라이트 모드"
		>
			<circle cx="12" cy="12" r="5" />
			<line x1="12" y1="1" x2="12" y2="3" />
			<line x1="12" y1="21" x2="12" y2="23" />
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
			<line x1="1" y1="12" x2="3" y2="12" />
			<line x1="21" y1="12" x2="23" y2="12" />
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="다크 모드"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	);
}

function BookmarkIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="북마크"
		>
			<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
		</svg>
	);
}

export function Header({
	articleCount,
	showBookmarks,
	onToggleBookmarks,
	theme,
	onToggleTheme,
}: HeaderProps) {
	return (
		<header className="header">
			<div className="header-inner">
				<div className="header-left">
					<h1>오늘의 사설</h1>
					<div className="subtitle" aria-live="polite">
						{showBookmarks ? `북마크 ${articleCount}건` : `사설 ${articleCount}건`}
					</div>
				</div>
				<div className="header-actions">
					<button
						className={`icon-btn${showBookmarks ? " active" : ""}`}
						aria-label={showBookmarks ? "전체 보기" : "북마크 보기"}
						title={showBookmarks ? "전체 보기" : "북마크 보기"}
						onClick={onToggleBookmarks}
						type="button"
					>
						<BookmarkIcon />
					</button>
					<button
						className="icon-btn"
						aria-label="다크 모드 전환"
						title="다크 모드 전환"
						onClick={onToggleTheme}
						type="button"
					>
						{theme === "dark" ? <MoonIcon /> : <SunIcon />}
					</button>
				</div>
			</div>
		</header>
	);
}
