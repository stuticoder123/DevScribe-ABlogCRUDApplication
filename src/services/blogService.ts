import { api } from './api';
import { APIResponse, Blog, BlogFormPayload, BlogQueryParams, Pagination } from '../types';

export const blogService = {
  async getBlogs(params: BlogQueryParams = {}): Promise<APIResponse<Pagination<Blog>>> {
    const { data } = await api.get<APIResponse<Pagination<Blog>>>('/blogs', { params });
    return data;
  },

  async getMyBlogs(params: BlogQueryParams = {}): Promise<APIResponse<Pagination<Blog>>> {
    const { data } = await api.get<APIResponse<Pagination<Blog>>>('/blogs/my', { params });
    return data;
  },

  async getBlogById(blogId: string): Promise<APIResponse<Blog>> {
    const { data } = await api.get<APIResponse<Blog>>(`/blogs/${blogId}`);
    return data;
  },

  async getBlogBySlug(slug: string): Promise<APIResponse<Blog>> {
    const { data } = await api.get<APIResponse<Blog>>(`/blogs/slug/${slug}`);
    return data;
  },

  async getBlogsByCategory(category: string, page = 1, limit = 10): Promise<APIResponse<Pagination<Blog>>> {
    const { data } = await api.get<APIResponse<Pagination<Blog>>>(`/blogs/category/${encodeURIComponent(category)}`, {
      params: { page, limit },
    });
    return data;
  },

  async getBlogsByTag(tag: string, page = 1, limit = 10): Promise<APIResponse<Pagination<Blog>>> {
    const { data } = await api.get<APIResponse<Pagination<Blog>>>(`/blogs/tag/${encodeURIComponent(tag)}`, {
      params: { page, limit },
    });
    return data;
  },

  async createBlog(payload: BlogFormPayload): Promise<APIResponse<Blog>> {
    const { data } = await api.post<APIResponse<Blog>>('/blogs', payload);
    return data;
  },

  async updateBlog(blogId: string, payload: Partial<BlogFormPayload>): Promise<APIResponse<Blog>> {
    const { data } = await api.put<APIResponse<Blog>>(`/blogs/${blogId}`, payload);
    return data;
  },

  async deleteBlog(blogId: string): Promise<APIResponse<null>> {
    const { data } = await api.delete<APIResponse<null>>(`/blogs/${blogId}`);
    return data;
  },

  async likeBlog(blogId: string): Promise<APIResponse<Blog>> {
    const { data } = await api.post<APIResponse<Blog>>(`/blogs/${blogId}/like`);
    return data;
  },

  async unlikeBlog(blogId: string): Promise<APIResponse<Blog>> {
    const { data } = await api.delete<APIResponse<Blog>>(`/blogs/${blogId}/like`);
    return data;
  },

  async bookmarkBlog(blogId: string): Promise<APIResponse<Blog>> {
    const { data } = await api.post<APIResponse<Blog>>(`/blogs/${blogId}/bookmark`);
    return data;
  },

  async unbookmarkBlog(blogId: string): Promise<APIResponse<Blog>> {
    const { data } = await api.delete<APIResponse<Blog>>(`/blogs/${blogId}/bookmark`);
    return data;
  },
};
