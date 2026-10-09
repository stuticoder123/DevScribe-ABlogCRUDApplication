import { api } from './api';
import { AdminStats, APIResponse, Blog, Pagination, User, UserRole } from '../types';

export const adminService = {
  async getStats(): Promise<APIResponse<AdminStats>> {
    const { data } = await api.get<APIResponse<AdminStats>>('/admin/stats');
    return data;
  },

  async getUsers(params: { search?: string; role?: string } = {}): Promise<APIResponse<User[]>> {
    const { data } = await api.get<APIResponse<User[]>>('/admin/users', { params });
    return data;
  },

  async updateUserRole(userId: string, role: UserRole): Promise<APIResponse<User>> {
    const { data } = await api.patch<APIResponse<User>>(`/admin/users/${userId}/role`, { role });
    return data;
  },

  async updateUserStatus(userId: string, is_active: boolean): Promise<APIResponse<User>> {
    const { data } = await api.patch<APIResponse<User>>(`/admin/users/${userId}/status`, { is_active });
    return data;
  },

  async getAllBlogs(params: { page?: number; limit?: number; search?: string; category?: string; status?: string } = {}): Promise<APIResponse<Pagination<Blog>>> {
    const { data } = await api.get<APIResponse<Pagination<Blog>>>('/admin/blogs', { params });
    return data;
  },

  async deleteAnyBlog(blogId: string): Promise<APIResponse<null>> {
    const { data } = await api.delete<APIResponse<null>>(`/admin/blogs/${blogId}`);
    return data;
  },
};
