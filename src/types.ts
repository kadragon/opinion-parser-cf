export interface Env {
	DB: D1Database;
	SCRAPE_KEY?: string;
}

export interface Article {
	id: number;
	newspaper: string;
	title: string;
	url: string;
	summary: string | null;
	published_at: string;
	scraped_at: string;
	image_url: string | null;
}

export interface Bookmark {
	id: number;
	article_id: number;
	client_token: string;
	created_at: string;
}

export interface ArticleWithBookmark extends Article {
	bookmarked: boolean;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}
