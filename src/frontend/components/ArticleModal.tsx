import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchArticleContent } from "../lib/api";
import type { ArticleContent } from "../lib/types";

interface ArticleModalProps {
	articleUrl: string;
	newspaper: string;
	onClose: () => void;
}

export function ArticleModal({ articleUrl, newspaper, onClose }: ArticleModalProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [content, setContent] = useState<ArticleContent | null>(null);
	const modalRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const controller = new AbortController();

		fetchArticleContent(articleUrl, controller.signal)
			.then((data) => {
				if (data.error) {
					setError(data.error);
				} else {
					setContent(data);
				}
			})
			.catch((err) => {
				if (err.name !== "AbortError") {
					setError("본문을 가져올 수 없습니다.");
				}
			})
			.finally(() => setLoading(false));

		return () => controller.abort();
	}, [articleUrl]);

	useEffect(() => {
		document.body.style.overflow = "hidden";

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.body.style.overflow = "";
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose]);

	useEffect(() => {
		modalRef.current?.focus();
	}, []);

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) onClose();
	};

	const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") onClose();
	};

	return createPortal(
		<div
			className="article-modal-overlay"
			onClick={handleOverlayClick}
			onKeyDown={handleOverlayKeyDown}
			aria-label="사설 본문"
		>
			<dialog className="article-modal" ref={modalRef} open aria-modal="true">
				<button className="article-modal-close" onClick={onClose} aria-label="닫기" type="button">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<title>닫기</title>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>

				{loading && (
					<div className="article-modal-loading">
						<div className="spinner" />
					</div>
				)}

				{error && (
					<div className="article-modal-error">
						<p>{error}</p>
						<a
							href={articleUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="article-modal-fallback"
						>
							원문 보기
						</a>
					</div>
				)}

				{content && !error && (
					<>
						<div className="article-modal-header">
							<span className="paper-badge" data-paper={content.newspaper || newspaper}>
								{content.newspaper || newspaper}
							</span>
							{content.publishedAt && (
								<span className="article-modal-date">{formatModalDate(content.publishedAt)}</span>
							)}
							<h2 className="article-modal-title">{content.title}</h2>
						</div>
						<div className="article-modal-body">
							{content.body.map((paragraph, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: paragraphs are static content, not reordered
								<p key={index}>{paragraph}</p>
							))}
						</div>
					</>
				)}

				<div className="article-modal-footer">
					<a
						href={articleUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="article-modal-fallback"
					>
						원문 보기
					</a>
				</div>
			</dialog>
		</div>,
		document.body,
	);
}

function formatModalDate(dateStr: string): string {
	try {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return dateStr;

		const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
		const y = kst.getUTCFullYear();
		const m = kst.getUTCMonth() + 1;
		const d = kst.getUTCDate();
		const h = String(kst.getUTCHours()).padStart(2, "0");
		const min = String(kst.getUTCMinutes()).padStart(2, "0");

		return `${y}년 ${m}월 ${d}일 ${h}:${min}`;
	} catch {
		return dateStr;
	}
}
