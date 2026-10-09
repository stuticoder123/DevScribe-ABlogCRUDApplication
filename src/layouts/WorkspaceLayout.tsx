import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, PenSquare } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/ui';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Workspace / Overview',
  '/my-blogs': 'Workspace / My Blogs',
  '/create': 'Workspace / Create Article',
  '/drafts': 'Workspace / Drafts',
  '/bookmarks': 'Workspace / Saved Bookmarks',
  '/profile': 'Workspace / Profile Settings',
  '/settings': 'Workspace / Profile Settings',
  '/admin': 'Administration / Overview',
  '/admin/users': 'Administration / User Directory',
  '/admin/blogs': 'Administration / Content Moderation',
};

export const WorkspaceLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumb =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/edit/')
      ? 'Workspace / Edit Article'
      : 'Workspace / Dashboard');

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close sidebar"
            className="relative z-10 m-3 h-9 w-9 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="sticky top-0 z-30 h-14 px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open workspace navigation"
              className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {breadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/explore"
              className="hidden sm:inline-block text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
            >
              Public Feed
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/create')}
            >
              <PenSquare className="w-3.5 h-3.5" />
              <span>Write Article</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
