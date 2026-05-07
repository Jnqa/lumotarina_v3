export interface Chapter {
  id: string;
  order: number;
  title: string;
  url: string | null;
  raw?: string;
  duration?: number | null;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  author: string;
  publishDate: string;
  language: string;
  chapters: Chapter[];
}

export interface BookInfo {
  id: string;
  title: string;
  description: string;
  author: string;
  cover?: string;
  publishDate: string;
  bookUrl: string;
  chaptersCount: number;
  status: 'completed' | 'in-progress' | 'draft';
  tags?: string[];
  currentChapter?: number;
  lastReadPercentage?: number;
}

export interface BooksListResponse {
  books: BookInfo[];
}

export interface Frontmatter {
  title: string;
  tags: string[];
  colors: Record<string, string>;
  type: string;
}

export type PageType = "prose" | "newspaper";

export interface Theme {
  bg: string;
  paper: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  sidebar: string;
}
