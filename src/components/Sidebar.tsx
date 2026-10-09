import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PenSquare,
  FileClock,
  Bookmark,
  User as UserIcon,
  Settings,
  Shield,
  Users,
  Layers,
  LogOut,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './ui';

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully.', 'info');
    navigate('/login');
  };

  const authorNavItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Blogs', to: '/my-blogs', icon: FileText },
    { label: 'Create Blog', to: '/create', icon: PenSquare },
    { label: 'Drafts', to: '/drafts', icon: FileClock },
    { label: 'Bookmarks', to: '/bookmarks', icon: Bookmark },
    { label: 'Public Profile', to: `/author/${user?.username || ''}`, icon: UserIcon },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const adminNavItems = [
    { label: 'Admin Overview', to: '/admin', icon: Shield },
    { label: 'Manage Users', to: '/admin/users', icon: Users },
    { label: 'Manage Blogs', to: '/admin/blogs', icon: Layers },
  ];

  const isLinkActive = (to: string) => location.pathname === to;

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full select-none">
      <div className="p-5 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            onClick={onNavigate}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
          >
            DevScribe
          </Link>
          <Link
            to="/explore"
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore</span>
          </Link>
        </div>

        <div className="space-y-1">
          <p className="px-3 pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Author Workspace
          </p>
          {authorNavItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <div className="space-y-1 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="px-3 pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Administration
            </p>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom user profile, theme toggle, and logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>Appearance</span>
            <span className="inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-200">
              {theme === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </>
              )}
            </span>
          </button>
        </div>

        {user && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <Link
              to="/settings"
              onClick={onNavigate}
              className="flex items-center gap-2.5 min-w-0"
            >
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  @{user.username} · {user.role}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
