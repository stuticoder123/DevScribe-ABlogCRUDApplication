import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      {/* Strict 3-zone Top Bar Contract: Brand wordmark — 4-5 nav links — 1 primary action */}
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 h-16">
        {/* Zone 1: Single text element wordmark */}
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          DevScribe
        </Link>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          <Link
            to="/explore"
            className={`transition-colors whitespace-nowrap shrink-0 ${isActive('/explore')}`}
          >
            Explore
          </Link>
          <Link
            to="/explore?category=Backend"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Categories
          </Link>
          <Link
            to="/author/alex_rivera"
            className={`transition-colors whitespace-nowrap shrink-0 ${
              location.pathname.startsWith('/author')
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Authors
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`transition-colors whitespace-nowrap shrink-0 ${isActive('/dashboard')}`}
              >
                Workspace
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`transition-colors whitespace-nowrap shrink-0 ${isActive('/admin')}`}
                >
                  Admin
                </Link>
              )}
            </>
          ) : (
            <Link
              to="/login"
              className={`transition-colors whitespace-nowrap shrink-0 ${isActive('/login')}`}
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/create' : '/register')}
            className="hidden sm:inline-flex px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isAuthenticated ? 'Write Article' : 'Get Started'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 space-y-3">
          <div className="flex flex-col space-y-2.5 text-sm font-medium">
            <Link
              to="/explore"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-slate-700 dark:text-slate-200"
            >
              Explore Blogs
            </Link>
            <Link
              to="/explore?category=Backend"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-slate-700 dark:text-slate-200"
            >
              Categories
            </Link>
            <Link
              to="/author/alex_rivera"
              onClick={() => setMobileOpen(false)}
              className="py-1.5 text-slate-700 dark:text-slate-200"
            >
              Featured Authors
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="py-1.5 text-slate-700 dark:text-slate-200"
                >
                  Workspace Dashboard
                </Link>
                <Link
                  to="/create"
                  onClick={() => setMobileOpen(false)}
                  className="py-1.5 text-blue-600 dark:text-blue-400 font-semibold"
                >
                  Write Article
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="py-1.5 text-slate-700 dark:text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="py-1.5 text-blue-600 dark:text-blue-400 font-semibold"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
