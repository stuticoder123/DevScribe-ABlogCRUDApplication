import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authService, LoginPayload, RegisterPayload } from '../services/authService';
import { clearStoredTokens } from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  updateCurrentUser: (updated: User) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      clearStoredTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (payload: LoginPayload): Promise<User> => {
    const res = await authService.login(payload);
    if (!res.data?.user) {
      throw new Error(res.message || 'Login failed');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const res = await authService.register(payload);
    if (!res.data?.user) {
      throw new Error(res.message || 'Registration failed');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const updateCurrentUser = (updated: User) => {
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        updateCurrentUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
