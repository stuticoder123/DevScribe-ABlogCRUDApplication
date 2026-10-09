import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10 px-6 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Link to="/" className="text-base font-bold text-slate-900 dark:text-white">
              DevScribe
            </Link>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Developer publishing workspace powered by FastAPI, MongoDB, and React.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link to="/explore" className="hover:text-slate-900 dark:hover:text-white">
              Explore Articles
            </Link>
            <Link to="/author/alex_rivera" className="hover:text-slate-900 dark:hover:text-white">
              Author Profiles
            </Link>
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Swagger API Docs
            </a>
            <a
              href="/redoc"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              ReDoc Reference
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark Theme</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
