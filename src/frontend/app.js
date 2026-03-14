(() => {
	// --- State ---
	const state = {
		articles: [],
		bookmarks: new Set(),
		currentPage: 1,
		pageSize: 15,
		hasMore: true,
		loading: false,
		filter: { newspaper: "", q: "", date: "" },
		showBookmarks: false,
		theme: "light",
	};

	// --- Client Token ---
	function getClientToken() {
		let token = localStorage.getItem("opinion-parser-client-token");
		if (!token) {
			token = crypto.randomUUID
				? crypto.randomUUID()
				: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
						const r = (Math.random() * 16) | 0;
						return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
					});
			localStorage.setItem("opinion-parser-client-token", token);
		}
		return token;
	}

	const clientToken = getClientToken();

	// --- Theme ---
	function initTheme() {
		const saved = localStorage.getItem("opinion-parser-theme");
		if (saved) {
			state.theme = saved;
		} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
			state.theme = "dark";
		}
		applyTheme();
	}

	function applyTheme() {
		document.documentElement.setAttribute("data-theme", state.theme);
		const lightIcon = document.getElementById("theme-icon-light");
		const darkIcon = document.getElementById("theme-icon-dark");
		if (state.theme === "dark") {
			lightIcon.style.display = "none";
			darkIcon.style.display = "block";
		} else {
			lightIcon.style.display = "block";
			darkIcon.style.display = "none";
		}
	}

	function toggleTheme() {
		state.theme = state.theme === "dark" ? "light" : "dark";
		localStorage.setItem("opinion-parser-theme", state.theme);
		applyTheme();
	}

	// --- API ---
	function fetchArticles(page) {
		const params = new URLSearchParams();
		if (state.filter.newspaper) params.set("newspaper", state.filter.newspaper);
		if (state.filter.date) params.set("date", state.filter.date);
		if (state.filter.q) params.set("q", state.filter.q);
		params.set("page", String(page));
		params.set("pageSize", String(state.pageSize));

		return fetch(`/api/articles?${params.toString()}`, {
			headers: { "X-Client-Token": clientToken },
		}).then((res) => {
			if (!res.ok) throw new Error("Failed to fetch articles");
			return res.json();
		});
	}

	function fetchBookmarks() {
		return fetch("/api/bookmarks", {
			headers: { "X-Client-Token": clientToken },
		})
			.then((res) => {
				if (!res.ok) return;
				return res.json();
			})
			.then((data) => {
				if (!data) return;
				const items = Array.isArray(data) ? data : data.bookmarks || [];
				state.bookmarks = new Set(items.map((b) => b.articleId || b.id || b));
			})
			.catch(() => {});
	}

	function toggleBookmark(articleId) {
		if (state.bookmarks.has(articleId)) {
			state.bookmarks.delete(articleId);
		} else {
			state.bookmarks.add(articleId);
		}
		renderArticles();

		fetch("/api/bookmarks", {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-Client-Token": clientToken },
			body: JSON.stringify({ articleId: articleId }),
		}).catch(() => {
			if (state.bookmarks.has(articleId)) {
				state.bookmarks.delete(articleId);
			} else {
				state.bookmarks.add(articleId);
			}
			renderArticles();
		});
	}

	// --- Helpers ---
	function estimateReadingTime(text) {
		if (!text) return 1;
		return Math.max(1, Math.ceil(text.length / 500));
	}

	// KST 기준으로 Date 객체에서 연/월/일/시/분 추출
	function toKst(d) {
		const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
		return {
			y: kst.getUTCFullYear(),
			m: kst.getUTCMonth() + 1,
			d: kst.getUTCDate(),
			h: kst.getUTCHours(),
			min: kst.getUTCMinutes(),
		};
	}

	function formatDate(dateStr) {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		const k = toKst(d);
		return `${k.m}/${k.d} ${String(k.h).padStart(2, "0")}:${String(k.min).padStart(2, "0")}`;
	}

	function getDateKey(dateStr) {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		const k = toKst(d);
		return `${k.y}-${String(k.m).padStart(2, "0")}-${String(k.d).padStart(2, "0")}`;
	}

	function getDateLabel(dateKey) {
		const now = new Date();
		const t = toKst(now);
		const todayKey = `${t.y}-${String(t.m).padStart(2, "0")}-${String(t.d).padStart(2, "0")}`;

		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const y = toKst(yesterday);
		const yesterdayKey = `${y.y}-${String(y.m).padStart(2, "0")}-${String(y.d).padStart(2, "0")}`;

		if (dateKey === todayKey) return "\uC624\uB298";
		if (dateKey === yesterdayKey) return "\uC5B4\uC81C";

		const parts = dateKey.split("-");
		return `${parts[0]}\uB144 ${Number.parseInt(parts[1])}\uC6D4 ${Number.parseInt(parts[2])}\uC77C`;
	}

	// --- Safe DOM construction ---
	function createElement(tag, attrs, children) {
		const el = document.createElement(tag);
		if (attrs) {
			for (const key of Object.keys(attrs)) {
				if (key === "className") {
					el.className = attrs[key];
				} else if (key === "textContent") {
					el.textContent = attrs[key];
				} else if (key.startsWith("data-")) {
					el.setAttribute(key, attrs[key]);
				} else {
					el.setAttribute(key, attrs[key]);
				}
			}
		}
		if (children) {
			for (const child of children) {
				if (typeof child === "string") {
					el.appendChild(document.createTextNode(child));
				} else if (child) {
					el.appendChild(child);
				}
			}
		}
		return el;
	}

	function createSvg(pathsHtml, w, h) {
		const ns = "http://www.w3.org/2000/svg";
		const wrapper = document.createElement("span");
		// SVG icons are static markup, safe to set
		wrapper.insertAdjacentHTML(
			"beforeend",
			`<svg xmlns="${ns}" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${pathsHtml}</svg>`,
		);
		return wrapper.firstChild;
	}

	function buildShareIcon() {
		return createSvg(
			'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>' +
				'<circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
				'<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
			16,
			16,
		);
	}

	function buildCheckIcon() {
		return createSvg('<polyline points="20 6 9 17 4 12"/>', 16, 16);
	}

	function buildStarIcon(filled) {
		const svg = createSvg(
			'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
			16,
			16,
		);
		if (filled) {
			svg.setAttribute("fill", "currentColor");
			svg.setAttribute("stroke-width", "2");
		}
		return svg;
	}

	function buildArticleCard(a) {
		const isBookmarked = state.bookmarks.has(a.id);
		const readTime = estimateReadingTime(a.summary || a.content || "");

		// Paper badge
		const badge = createElement("span", {
			className: "paper-badge",
			"data-paper": a.newspaper,
			textContent: a.newspaper,
		});

		// Reading time
		const timeEst = createElement("span", {
			className: "reading-time",
			textContent: `${readTime}\uBD84 \uC77D\uAE30`,
		});

		// Share button
		const shareBtn = createElement(
			"button",
			{
				className: "card-action-btn share-btn",
				"aria-label": "\uACF5\uC720\uD558\uAE30",
				title: "\uACF5\uC720\uD558\uAE30",
				"data-title": a.title,
				"data-url": a.link || a.url || "",
			},
			[buildShareIcon()],
		);

		// Bookmark button
		const bookmarkBtn = createElement(
			"button",
			{
				className: `card-action-btn bookmark-btn${isBookmarked ? " bookmarked" : ""}`,
				"aria-label": isBookmarked
					? "\uBD81\uB9C8\uD06C \uD574\uC81C"
					: "\uBD81\uB9C8\uD06C \uCD94\uAC00",
				title: isBookmarked ? "\uBD81\uB9C8\uD06C \uD574\uC81C" : "\uBD81\uB9C8\uD06C \uCD94\uAC00",
				"data-id": String(a.id),
			},
			[buildStarIcon(isBookmarked)],
		);

		// Title link
		const titleLink = createElement("a", {
			href: a.link || a.url || "#",
			target: "_blank",
			rel: "noopener noreferrer",
			textContent: a.title,
		});

		const titleEl = createElement("h2", { className: "article-title" }, [titleLink]);

		// Summary
		let summaryEl = null;
		if (a.summary) {
			summaryEl = createElement("p", {
				className: "article-summary",
				textContent: a.summary,
			});
		}

		// Date
		const dateEl = createElement("time", {
			className: "article-date",
			datetime: a.publishedAt || a.date || "",
			textContent: formatDate(a.publishedAt || a.date || a.createdAt || ""),
		});

		const topLeft = createElement("div", { className: "card-top-left" }, [badge, timeEst]);
		const actions = createElement("div", { className: "card-actions" }, [shareBtn, bookmarkBtn]);
		const top = createElement("div", { className: "card-top" }, [topLeft, actions]);

		const card = createElement(
			"article",
			{
				className: "article-card",
				"data-id": String(a.id),
			},
			[top, titleEl, summaryEl, dateEl].filter(Boolean),
		);

		return card;
	}

	// --- Rendering ---
	function renderArticles() {
		const container = document.getElementById("main-content");
		let articles = state.articles;

		if (state.showBookmarks) {
			articles = articles.filter((a) => state.bookmarks.has(a.id));
		}

		// Update count
		const countEl = document.getElementById("article-count");
		if (state.showBookmarks) {
			countEl.textContent = `\uBD81\uB9C8\uD06C ${articles.length}\uAC74`;
		} else {
			countEl.textContent = `\uC0AC\uC124 ${articles.length}\uAC74`;
		}

		// Clear container
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}

		if (articles.length === 0) {
			const emptyIcon = createElement("div", {
				className: "empty-state-icon",
				textContent: state.showBookmarks ? "\uD83D\uDD16" : "\uD83D\uDCF0",
			});
			const emptyTitle = createElement("div", {
				className: "empty-state-title",
				textContent: state.showBookmarks
					? "\uC800\uC7A5\uB41C \uBD81\uB9C8\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"
					: "\uAE30\uC0AC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
			});
			const emptyDesc = createElement("div", {
				className: "empty-state-desc",
				textContent: state.showBookmarks
					? "\uAD00\uC2EC \uC788\uB294 \uC0AC\uC124\uC744 \uBD81\uB9C8\uD06C\uD574 \uBCF4\uC138\uC694"
					: "\uB2E4\uB978 \uAC80\uC0C9\uC5B4\uB098 \uD544\uD130\uB97C \uC2DC\uB3C4\uD574 \uBCF4\uC138\uC694",
			});
			const emptyState = createElement("div", { className: "empty-state" }, [
				emptyIcon,
				emptyTitle,
				emptyDesc,
			]);
			container.appendChild(emptyState);
			return;
		}

		// Group by date
		const groups = {};
		const groupOrder = [];
		for (const a of articles) {
			const key = getDateKey(a.publishedAt || a.date || a.createdAt || "");
			if (!groups[key]) {
				groups[key] = [];
				groupOrder.push(key);
			}
			groups[key].push(a);
		}

		for (const key of groupOrder) {
			const header = createElement("div", {
				className: "date-group-header",
				textContent: getDateLabel(key),
			});
			container.appendChild(header);

			for (const a of groups[key]) {
				container.appendChild(buildArticleCard(a));
			}
		}

		// Load more button
		if (!state.showBookmarks && state.hasMore) {
			const loadBtn = createElement("button", {
				className: "load-more-btn",
				id: "load-more-btn",
				textContent: "\uB354 \uBCF4\uAE30",
			});
			if (state.loading) loadBtn.disabled = true;
			const wrap = createElement("div", { className: "load-more-wrap" }, [loadBtn]);
			container.appendChild(wrap);
		}
	}

	// --- Data Loading ---
	function loadArticles(reset) {
		if (state.loading) return;
		state.loading = true;

		if (reset) {
			state.currentPage = 1;
			state.articles = [];
			state.hasMore = true;
			const container = document.getElementById("main-content");
			while (container.firstChild) container.removeChild(container.firstChild);
			const spinWrap = createElement("div", { className: "loading-indicator" });
			const spin = createElement("div", { className: "spinner" });
			spinWrap.appendChild(spin);
			container.appendChild(spinWrap);
		}

		fetchArticles(state.currentPage)
			.then((data) => {
				const newArticles = data.articles || data.data || data.results || [];
				if (reset) {
					state.articles = newArticles;
				} else {
					state.articles = state.articles.concat(newArticles);
				}
				state.hasMore = newArticles.length >= state.pageSize;
				state.currentPage++;
				state.loading = false;
				renderArticles();
			})
			.catch((e) => {
				console.error("Failed to load articles:", e);
				state.loading = false;
				if (state.articles.length === 0) {
					const container = document.getElementById("main-content");
					while (container.firstChild) container.removeChild(container.firstChild);
					const emptyIcon = createElement("div", {
						className: "empty-state-icon",
						textContent: "\u26A0\uFE0F",
					});
					const emptyTitle = createElement("div", {
						className: "empty-state-title",
						textContent: "\uAE30\uC0AC\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
					});
					const emptyDesc = createElement("div", {
						className: "empty-state-desc",
						textContent: "\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694",
					});
					const emptyState = createElement("div", { className: "empty-state" }, [
						emptyIcon,
						emptyTitle,
						emptyDesc,
					]);
					container.appendChild(emptyState);
				} else {
					renderArticles();
				}
			});
	}

	// --- Event Delegation ---
	document.getElementById("main-content").addEventListener("click", (e) => {
		const bookmarkBtn = e.target.closest(".bookmark-btn");
		if (bookmarkBtn) {
			e.preventDefault();
			const id = bookmarkBtn.getAttribute("data-id");
			toggleBookmark(Number.isNaN(id) ? id : Number(id));
			return;
		}

		const shareBtn = e.target.closest(".share-btn");
		if (shareBtn) {
			e.preventDefault();
			const title = shareBtn.getAttribute("data-title");
			const url = shareBtn.getAttribute("data-url");
			if (navigator.share) {
				navigator.share({ title: title, url: url }).catch(() => {});
			} else if (navigator.clipboard) {
				navigator.clipboard.writeText(url).then(() => {
					while (shareBtn.firstChild) shareBtn.removeChild(shareBtn.firstChild);
					shareBtn.appendChild(buildCheckIcon());
					setTimeout(() => {
						while (shareBtn.firstChild) shareBtn.removeChild(shareBtn.firstChild);
						shareBtn.appendChild(buildShareIcon());
					}, 1500);
				});
			}
			return;
		}

		const loadMoreBtn = e.target.closest("#load-more-btn");
		if (loadMoreBtn) {
			loadArticles(false);
			return;
		}
	});

	// --- Newspaper Filters ---
	document.querySelector(".newspaper-filters").addEventListener("click", (e) => {
		const btn = e.target.closest(".filter-btn");
		if (!btn) return;

		for (const b of document.querySelectorAll(".filter-btn")) {
			b.classList.remove("active");
		}
		btn.classList.add("active");

		const paper = btn.getAttribute("data-paper");
		state.filter.newspaper = paper === "all" ? "" : paper;
		loadArticles(true);
	});

	// --- Search with debounce ---
	let searchTimeout;
	document.getElementById("search-input").addEventListener("input", (e) => {
		clearTimeout(searchTimeout);
		const val = e.target.value.trim();
		searchTimeout = setTimeout(() => {
			state.filter.q = val;
			loadArticles(true);
		}, 300);
	});

	// --- Date filter ---
	document.getElementById("date-input").addEventListener("change", (e) => {
		state.filter.date = e.target.value;
		loadArticles(true);
	});

	// --- Bookmark toggle ---
	document.getElementById("bookmark-toggle").addEventListener("click", function () {
		state.showBookmarks = !state.showBookmarks;
		this.classList.toggle("active", state.showBookmarks);
		this.setAttribute(
			"aria-label",
			state.showBookmarks ? "\uC804\uCCB4 \uBCF4\uAE30" : "\uBD81\uB9C8\uD06C \uBCF4\uAE30",
		);
		this.title = state.showBookmarks
			? "\uC804\uCCB4 \uBCF4\uAE30"
			: "\uBD81\uB9C8\uD06C \uBCF4\uAE30";
		renderArticles();
	});

	// --- Theme toggle ---
	document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

	// --- System theme change ---
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
		if (!localStorage.getItem("opinion-parser-theme")) {
			state.theme = e.matches ? "dark" : "light";
			applyTheme();
		}
	});

	// --- Init ---
	initTheme();
	fetchBookmarks();
	loadArticles(true);
})();
