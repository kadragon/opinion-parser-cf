export interface ParsedArticle {
	title: string;
	publishedAt: string;
	body: string[];
	newspaper: string;
}

export interface ArticleContentParser {
	domain: string;
	newspaper: string;
	parse(html: string): ParsedArticle;
}
