import { useCallback, useState } from "react";
import { useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import type { Filters } from "../lib/types";

const NEWSPAPERS = [
	{ key: "all", label: "전체" },
	{ key: "중앙일보", label: "중앙일보" },
	{ key: "조선일보", label: "조선일보" },
	{ key: "동아일보", label: "동아일보" },
	{ key: "한겨레", label: "한겨레" },
	{ key: "경향신문", label: "경향신문" },
];

interface FilterBarProps {
	filters: Filters;
	onFilterChange: (filters: Filters) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
	const [searchText, setSearchText] = useState(filters.q);
	const debouncedSearch = useDebounce(searchText, 300);

	useEffect(() => {
		if (debouncedSearch !== filters.q) {
			onFilterChange({ ...filters, q: debouncedSearch });
		}
	}, [debouncedSearch, filters, onFilterChange]);

	const handleNewspaperClick = useCallback(
		(key: string) => {
			onFilterChange({ ...filters, newspaper: key === "all" ? "" : key });
		},
		[filters, onFilterChange],
	);

	const handleDateChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onFilterChange({ ...filters, date: e.target.value });
		},
		[filters, onFilterChange],
	);

	const activeNewspaper = filters.newspaper || "all";

	return (
		<nav className="controls" aria-label="기사 필터">
			<div className="newspaper-filters" role="radiogroup" aria-label="신문사 필터">
				{NEWSPAPERS.map((np) => (
					<button
						key={np.key}
						className={`filter-btn${activeNewspaper === np.key ? " active" : ""}`}
						data-paper={np.key}
						onClick={() => handleNewspaperClick(np.key)}
						type="button"
					>
						{np.label}
					</button>
				))}
			</div>
			<div className="search-row">
				<input
					type="search"
					className="search-input"
					placeholder="제목으로 검색..."
					aria-label="기사 제목 검색"
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
				/>
				<input
					type="date"
					className="date-input"
					aria-label="날짜 선택"
					value={filters.date}
					onChange={handleDateChange}
				/>
			</div>
		</nav>
	);
}
