import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractErrorMessage } from '../services/api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Button, Input } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useDocumentMeta({
    title: 'Sign In — DevScribe',
    description: 'Sign in to your DevScribe developer workspace.',
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please enter your email or username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login({ identifier: identifier.trim(), password });
      showToast(`Welcome back, ${loggedUser.name}.`, 'success');
      navigate(loggedUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Invalid credentials.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoIdentifier: string) => {
    setIdentifier(demoIdentifier);
    setPassword('DevScribe#2026');
    setError(null);
    setSubmitting(true);
    try {
      const loggedUser = await login({
        identifier: demoIdentifier,
        password: 'DevScribe#2026',
      });
      showToast(`Signed in as ${loggedUser.name} (${loggedUser.role}).`, 'success');
      navigate(loggedUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sign in to DevScribe
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Access your author dashboard, drafts, and saved bookmarks.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Email or Username"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="alex@devscribe.dev or alex_rivera"
            autoComplete="username"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={submitting}
          >
            Sign In
          </Button>
        </form>

        {/* Quick Development Workspace Credentials */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
            One-Click Seeded Account Access (Development):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleQuickDemoLogin('alex_rivera')}
            >
              Author: @alex_rivera
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleQuickDemoLogin('elena_admin')}
            >
              Admin: @elena_admin
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
          Don&apos;t have an account yet?{' '}
          <Link
            to="/register"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
