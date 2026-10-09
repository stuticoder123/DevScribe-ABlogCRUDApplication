import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractErrorMessage } from '../services/api';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Button, Input } from '../components/ui';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useDocumentMeta({
    title: 'Create Account — DevScribe',
    description: 'Join DevScribe to publish technical articles and manage your engineering portfolio.',
  });

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.';
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username.trim())) {
      nextErrors.username =
        'Username must be 3–32 characters (letters, numbers, underscores, or hyphens).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const user = await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      });
      showToast(`Account created! Welcome to DevScribe, ${user.name}.`, 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Registration failed.');
      setApiError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create your author account
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Start drafting technical articles and building your engineering portfolio.
          </p>
        </div>

        {apiError && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            error={errors.name}
            required
          />

          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="alex_rivera"
            helperText="Used in your public profile URL: /author/username"
            error={errors.username}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@devscribe.dev"
            error={errors.email}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            error={errors.password}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            error={errors.confirmPassword}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={submitting}
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
