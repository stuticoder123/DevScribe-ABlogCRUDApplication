import { api, setStoredTokens, clearStoredTokens } from './api';
import { APIResponse, AuthResponse, User } from '../types';

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<APIResponse<AuthResponse>> {
    const { data } = await api.post<APIResponse<AuthResponse>>('/auth/register', payload);
    if (data.data?.access_token) {
      setStoredTokens(data.data.access_token, data.data.refresh_token);
    }
    return data;
  },

  async login(payload: LoginPayload): Promise<APIResponse<AuthResponse>> {
    const { data } = await api.post<APIResponse<AuthResponse>>('/auth/login', payload);
    if (data.data?.access_token) {
      setStoredTokens(data.data.access_token, data.data.refresh_token);
    }
    return data;
  },

  async logout(): Promise<APIResponse<null>> {
    try {
      const { data } = await api.post<APIResponse<null>>('/auth/logout');
      return data;
    } finally {
      clearStoredTokens();
    }
  },

  async getMe(): Promise<APIResponse<User>> {
    const { data } = await api.get<APIResponse<User>>('/auth/me');
    return data;
  },
};
