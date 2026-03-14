import { useCallback, useState } from "react";
import { estimateReadingTime, formatDate } from "../lib/date";
import type { Article } from "../lib/types";

interface ArticleCardProps {
	article: Article;
	isBookmarked: boolean;
	onToggleBookmark: (id: number) => void;
}

function ShareIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="공유"
		>
			<circle cx="18" cy="5" r="3" />
			<circle cx="6" cy="12" r="3" />
			<circle cx="18" cy="19" r="3" />
			<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
			<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="복사 완료"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

function StarIcon({ filled }: { filled: boolean }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth={filled ? "2" : "2.5"}
			strokeLinecap="round"
			strokeLinejoin="round"
			role="img"
			aria-label="북마크"
		>
			<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
		</svg>
	);
}

export function ArticleCard({ article, isBookmarked, onToggleBookmark }: ArticleCardProps) {
	const [shared, setShared] = useState(false);
	const a = article;
	const readTime = estimateReadingTime(a.summary || a.content || "");
	const articleUrl = a.link || a.url || "";
	const articleDate = a.publishedAt || a.date || a.createdAt || "";

	const handleShare = useCallback(() => {
		if (navigator.share) {
			navigator.share({ title: a.title, url: articleUrl }).catch(() => {});
		} else if (navigator.clipboard) {
			navigator.clipboard.writeText(articleUrl).then(() => {
				setShared(true);
				setTimeout(() => setShared(false), 1500);
			});
		}
	}, [a.title, articleUrl]);

	const handleBookmark = useCallback(() => {
		onToggleBookmark(a.id);
	}, [a.id, onToggleBookmark]);

	return (
		<article className="article-card" data-id={a.id}>
			<div className="card-top">
				<div className="card-top-left">
					<span className="paper-badge" data-paper={a.newspaper}>
						{a.newspaper}
					</span>
					<span className="reading-time">{readTime}분 읽기</span>
				</div>
				<div className="card-actions">
					<button
						className="card-action-btn share-btn"
						aria-label="공유하기"
						title="공유하기"
						onClick={handleShare}
						type="button"
					>
						{shared ? <CheckIcon /> : <ShareIcon />}
					</button>
					<button
						className={`card-action-btn bookmark-btn${isBookmarked ? " bookmarked" : ""}`}
						aria-label={isBookmarked ? "북마크 해제" : "북마크 추가"}
						title={isBookmarked ? "북마크 해제" : "북마크 추가"}
						onClick={handleBookmark}
						type="button"
					>
						<StarIcon filled={isBookmarked} />
					</button>
				</div>
			</div>
			<h2 className="article-title">
				<a href={articleUrl || "#"} target="_blank" rel="noopener noreferrer">
					{a.title}
				</a>
			</h2>
			{a.summary && <p className="article-summary">{a.summary}</p>}
			<time className="article-date" dateTime={articleDate}>
				{formatDate(articleDate)}
			</time>
		</article>
	);
}
