import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { APIResponse } from '../types';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_STORAGE_KEY = 'devscribe_access_token';
const REFRESH_STORAGE_KEY = 'devscribe_refresh_token';

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_STORAGE_KEY, refreshToken);
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_STORAGE_KEY);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
            { withCredentials: true }
          );
          if (res.data?.data?.access_token) {
            setStoredTokens(res.data.data.access_token, res.data.data.refresh_token);
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${res.data.data.access_token}`;
            }
            return api(originalRequest);
          }
        } catch {
          clearStoredTokens();
        }
      }
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as APIResponse | undefined;
    if (data?.message) return data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
