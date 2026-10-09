import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ForbiddenPage, UnauthorizedPage } from '../pages/ErrorPages';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying workspace session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <UnauthorizedPage />;
  }

  if (requireAdmin && !isAdmin) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
};
