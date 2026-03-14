interface LoadMoreButtonProps {
	loading: boolean;
	onClick: () => void;
}

export function LoadMoreButton({ loading, onClick }: LoadMoreButtonProps) {
	return (
		<div className="load-more-wrap">
			<button className="load-more-btn" onClick={onClick} disabled={loading} type="button">
				더 보기
			</button>
		</div>
	);
}
