import { api } from './api';
import { APIResponse, AuthorProfile, Blog, DashboardStats, SocialLinks, User } from '../types';

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  avatar?: string;
  social_links?: SocialLinks;
}

export const userService = {
  async getDashboardStats(): Promise<APIResponse<DashboardStats>> {
    const { data } = await api.get<APIResponse<DashboardStats>>('/users/dashboard');
    return data;
  },

  async getBookmarks(): Promise<APIResponse<Blog[]>> {
    const { data } = await api.get<APIResponse<Blog[]>>('/users/bookmarks');
    return data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<APIResponse<User>> {
    const { data } = await api.put<APIResponse<User>>('/users/profile', payload);
    return data;
  },

  async getAuthorProfile(username: string): Promise<APIResponse<AuthorProfile>> {
    const { data } = await api.get<APIResponse<AuthorProfile>>(`/users/profile/${encodeURIComponent(username)}`);
    return data;
  },
};
