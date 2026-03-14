import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(() => {
		const saved = localStorage.getItem("opinion-parser-theme");
		if (saved === "light" || saved === "dark") return saved;
		if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
		return "light";
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => {
			if (!localStorage.getItem("opinion-parser-theme")) {
				setTheme(e.matches ? "dark" : "light");
			}
		};
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			localStorage.setItem("opinion-parser-theme", next);
			return next;
		});
	}, []);

	return { theme, toggleTheme };
}
