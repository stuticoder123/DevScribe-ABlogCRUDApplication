import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, FileQuestion } from 'lucide-react';
import { Button } from '../components/ui';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  useDocumentMeta({ title: '404 Page Not Found — DevScribe' });

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">HTTP 404</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The requested article or workspace route does not exist or may have been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/explore')}>
            Explore Blogs
          </Button>
        </div>
      </div>
    </div>
  );
};

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  useDocumentMeta({ title: '401 Authentication Required — DevScribe' });

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-amber-600 dark:text-amber-400">HTTP 401</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          Authentication required
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Please sign in to your DevScribe account to access your personal workspace, drafts, and bookmarks.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            Home
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  useDocumentMeta({ title: '403 Access Forbidden — DevScribe' });

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-red-600 dark:text-red-400">HTTP 403</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
          Insufficient permissions
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your account role does not grant access to this resource or administration console.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            My Workspace
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/explore')}>
            Explore Blogs
          </Button>
        </div>
      </div>
    </div>
  );
};
