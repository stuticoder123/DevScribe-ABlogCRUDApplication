export type UserRole = 'user' | 'admin';
export type BlogStatus = 'draft' | 'published';

export interface SocialLinks {
  github: string;
  website: string;
  x: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  role: UserRole;
  is_active: boolean;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  views: number;
  likes_count: number;
  bookmarks_count: number;
  read_time: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Pagination<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface DashboardStats {
  total_blogs: number;
  published_blogs: number;
  draft_blogs: number;
  total_views: number;
  total_likes: number;
  bookmarks_count: number;
  recent_posts: Blog[];
}

export interface AuthorProfile extends User {
  stats: {
    blog_count: number;
    total_views: number;
    total_likes: number;
    categories: string[];
  };
  blogs: Blog[];
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_blogs: number;
  published_blogs: number;
  draft_blogs: number;
}

export interface BlogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  author?: string;
  status?: string;
  sort?: 'latest' | 'views' | 'likes' | 'oldest';
}

export interface BlogFormPayload {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category: string;
  tags: string[];
  status: BlogStatus;
}
