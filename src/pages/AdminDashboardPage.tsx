import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Eye, Trash2, Shield, UserCheck, UserX } from 'lucide-react';
import { AdminStats, Blog, User, UserRole } from '../types';
import { adminService } from '../services/adminService';
import { extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  Avatar,
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingSkeleton,
  SearchBar,
  Select,
  StatCard,
} from '../components/ui';
import { formatDate, formatNumber } from '../utils/formatters';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useDocumentMeta({
    title: 'Admin Console — DevScribe',
  });

  const activeSection = location.pathname.includes('/admin/users')
    ? 'users'
    : location.pathname.includes('/admin/blogs')
    ? 'blogs'
    : 'overview';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const [blogSearch, setBlogSearch] = useState('');
  const [blogStatusFilter, setBlogStatusFilter] = useState('all');
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [deletingBlog, setDeletingBlog] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, blogsRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers({
          search: userSearch || undefined,
          role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
        }),
        adminService.getAllBlogs({
          limit: 50,
          search: blogSearch || undefined,
          status: blogStatusFilter,
        }),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (blogsRes.data) setBlogs(blogsRes.data.items);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userSearch, userRoleFilter, blogSearch, blogStatusFilter]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleChangeRole = async (targetUser: User, nextRole: UserRole) => {
    try {
      await adminService.updateUserRole(targetUser.id, nextRole);
      showToast(`Updated @${targetUser.username} role to ${nextRole}.`, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    const nextActive = !targetUser.is_active;
    try {
      await adminService.updateUserStatus(targetUser.id, nextActive);
      showToast(
        `User @${targetUser.username} ${nextActive ? 'activated' : 'deactivated'}.`,
        'success'
      );
      fetchAdminData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleConfirmDeleteBlog = async () => {
    if (!blogToDelete) return;
    setDeletingBlog(true);
    try {
      await adminService.deleteAnyBlog(blogToDelete.id);
      showToast('Blog deleted by administrator.', 'success');
      setBlogToDelete(null);
      fetchAdminData();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setDeletingBlog(false);
    }
  };

  if (loading && !stats) {
    return <LoadingSkeleton count={4} variant="row" />;
  }

  if (error && !stats) {
    return <ErrorState message={error} onRetry={fetchAdminData} />;
  }

  const growthData = [
    { month: 'Jul', users: 1, published: 2, drafts: 1 },
    { month: 'Aug', users: 2, published: 4, drafts: 1 },
    { month: 'Sep', users: 3, published: 6, drafts: 1 },
    {
      month: 'Oct',
      users: stats?.total_users || 3,
      published: stats?.published_blogs || 8,
      drafts: stats?.draft_blogs || 1,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Section Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Platform Administration
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Monitor platform metrics, manage user permissions, and moderate published content.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeSection === 'users'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Manage Users ({users.length})
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/blogs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeSection === 'blogs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Manage Blogs ({blogs.length})
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={stats.total_users} subtext="Registered accounts" />
          <StatCard label="Active Users" value={stats.active_users} subtext="Enabled sessions" />
          <StatCard label="Total Blogs" value={stats.total_blogs} subtext="All database entries" />
          <StatCard label="Published Blogs" value={stats.published_blogs} subtext="Publicly indexed" />
          <StatCard label="Draft Blogs" value={stats.draft_blogs} subtext="Private author drafts" />
        </div>
      )}

      {/* Charts Section (shown on Overview) */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Users Growth
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Cumulative verified developer accounts over time.
            </p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Total Users"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Blog Publishing Activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Published articles versus drafts across the platform.
            </p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="published" name="Published" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="drafts" name="Drafts" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Section */}
      {(activeSection === 'overview' || activeSection === 'users') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Users Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modify user roles or deactivate accounts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-60">
                <SearchBar
                  value={userSearch}
                  onChange={setUserSearch}
                  placeholder="Search user or email..."
                />
              </div>
              <div className="w-36">
                <Select
                  aria-label="Filter by role"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Admins' },
                    { value: 'user', label: 'Authors' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <Link
                          to={`/author/${u.username}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <Avatar src={u.avatar} name={u.name} size="xs" />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {u.name}
                            </p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              @{u.username}
                            </p>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium">
                        <span
                          className={
                            u.role === 'admin'
                              ? 'text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium">
                        <span
                          className={
                            u.is_active
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChangeRole(u, u.role === 'admin' ? 'user' : 'admin')
                            }
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>
                              {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                            </span>
                          </Button>

                          <Button
                            variant={u.is_active ? 'ghost' : 'outline'}
                            size="sm"
                            disabled={isSelf}
                            onClick={() => handleToggleUserStatus(u)}
                            className={
                              u.is_active
                                ? 'text-red-600 hover:text-red-700 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {u.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Deactivate</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blogs Moderation Table */}
      {(activeSection === 'overview' || activeSection === 'blogs') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                All Platform Blogs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect and moderate published articles and author drafts across DevScribe.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-60">
                <SearchBar
                  value={blogSearch}
                  onChange={setBlogSearch}
                  placeholder="Search title or author..."
                />
              </div>
              <div className="w-36">
                <Select
                  aria-label="Filter blogs by status"
                  value={blogStatusFilter}
                  onChange={(e) => setBlogStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'published', label: 'Published' },
                    { value: 'draft', label: 'Drafts' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                  <th className="py-3.5 px-6">Title</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Views</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {blogs.map((blog) => (
                  <tr
                    key={blog.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-6 max-w-xs">
                      <Link
                        to={`/blog/${blog.slug}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                      >
                        {blog.title}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <Link
                        to={`/author/${blog.author_username}`}
                        className="hover:underline"
                      >
                        {blog.author_name}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {blog.category}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-medium whitespace-nowrap">
                      <span
                        className={
                          blog.status === 'published'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {blog.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      {formatNumber(blog.views)}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {formatDate(blog.created_at)}
                    </td>

                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/blog/${blog.slug}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBlogToDelete(blog)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(blogToDelete)}
        onClose={() => setBlogToDelete(null)}
        onConfirm={handleConfirmDeleteBlog}
        title="Admin Blog Removal"
        description={`Are you sure you want to delete "${blogToDelete?.title || ''}" authored by ${blogToDelete?.author_name || ''}?`}
        confirmLabel="Delete Blog"
        isLoading={deletingBlog}
      />
    </div>
  );
};
