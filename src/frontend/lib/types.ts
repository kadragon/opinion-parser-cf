export interface Article {
	id: number;
	newspaper: string;
	title: string;
	url: string;
	link?: string;
	summary: string | null;
	content?: string | null;
	publishedAt?: string;
	published_at?: string;
	date?: string;
	createdAt?: string;
	scraped_at?: string;
	image_url?: string | null;
}

export interface PaginatedResponse {
	data: Article[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface BookmarkItem {
	articleId?: number;
	id?: number;
}

export interface Filters {
	newspaper: string;
	q: string;
	date: string;
}

export interface ArticleContent {
	title: string;
	publishedAt: string;
	body: string[];
	newspaper: string;
	error?: string;
	fallbackUrl?: string;
}
