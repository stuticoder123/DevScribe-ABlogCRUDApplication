import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  Edit3,
  Trash2,
  Send,
  FileClock,
  PenSquare,
} from 'lucide-react';
import { Blog } from '../types';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PaginationControl,
  SearchBar,
  Select,
} from '../components/ui';
import { CATEGORIES, formatDate, formatNumber } from '../utils/formatters';

interface MyBlogsPageProps {
  initialStatus?: 'all' | 'published' | 'draft';
}

export const MyBlogsPage: React.FC<MyBlogsPageProps> = ({ initialStatus = 'all' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useDocumentMeta({
    title: initialStatus === 'draft' ? 'My Drafts — DevScribe' : 'My Blogs — DevScribe',
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sort, setSort] = useState<'latest' | 'views' | 'likes'>('latest');
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(search, 250);

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(initialStatus);
    setPage(1);
  }, [initialStatus]);

  const fetchMyBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await blogService.getMyBlogs({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter,
        sort,
      });
      if (res.data) {
        setBlogs(res.data.items);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter, statusFilter, sort]);

  useEffect(() => {
    fetchMyBlogs();
  }, [fetchMyBlogs]);

  const handleToggleStatus = async (blog: Blog) => {
    const nextStatus = blog.status === 'published' ? 'draft' : 'published';
    setTogglingId(blog.id);
    try {
      await blogService.updateBlog(blog.id, { status: nextStatus });
      showToast(
        nextStatus === 'published'
          ? 'Blog published successfully.'
          : 'Blog moved to drafts.',
        'success'
      );
      fetchMyBlogs();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!blogToDelete) return;
    setDeleting(true);
    try {
      await blogService.deleteBlog(blogToDelete.id);
      showToast('Blog deleted successfully.', 'success');
      setBlogToDelete(null);
      fetchMyBlogs();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {statusFilter === 'draft' ? 'Draft Articles' : 'My Blogs'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your published articles and works in progress.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/create')}>
          <PenSquare className="w-4 h-4" />
          <span>New Article</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
        <div className="md:col-span-5">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Filter your articles by title or keyword..."
          />
        </div>

        <div className="md:col-span-2">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Drafts Only' },
            ]}
          />
        </div>

        <div className="md:col-span-3">
          <Select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'All', label: 'All Categories' },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <Select
            aria-label="Sort articles"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'latest' | 'views' | 'likes');
              setPage(1);
            }}
            options={[
              { value: 'latest', label: 'Sort: Latest' },
              { value: 'views', label: 'Sort: Views' },
              { value: 'likes', label: 'Sort: Likes' },
            ]}
          />
        </div>
      </div>

      {/* Management Table */}
      {loading ? (
        <LoadingSkeleton count={5} variant="row" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMyBlogs} />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="No matching articles found"
          description={
            statusFilter === 'draft'
              ? 'You have no saved drafts matching these criteria.'
              : 'You have not created any blog posts matching these filters yet.'
          }
          actionLabel="Write New Blog"
          onAction={() => navigate('/create')}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/50">
                  <th className="py-3.5 px-6">Blog</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Views</th>
                  <th className="py-3.5 px-4 text-right">Likes</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {blogs.map((blog) => (
                  <tr
                    key={blog.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-6 max-w-xs">
                      <Link
                        to={`/blog/${blog.slug}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                      >
                        {blog.title}
                      </Link>
                      <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                        /{blog.slug}
                      </p>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-xs font-medium">
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

                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {blog.category}
                    </td>

                    <td className="py-4 px-4 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      {formatNumber(blog.views)}
                    </td>

                    <td className="py-4 px-4 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                      {formatNumber(blog.likes_count)}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatDate(blog.updated_at)}
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/blog/${blog.slug}`)}
                          title="View article"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit/${blog.id}`)}
                          title="Edit article"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingId === blog.id}
                          onClick={() => handleToggleStatus(blog)}
                        >
                          {blog.status === 'draft' ? (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </>
                          ) : (
                            <>
                              <FileClock className="w-3.5 h-3.5" />
                              <span>Move to Draft</span>
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBlogToDelete(blog)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          title="Delete article"
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

          <div className="px-6 pb-5">
            <PaginationControl
              page={page}
              pages={pages}
              total={total}
              onPageChange={(next) => setPage(next)}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(blogToDelete)}
        onClose={() => setBlogToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Blog Deletion"
        description={`Are you sure you want to permanently delete "${blogToDelete?.title || ''}"? All associated likes and bookmarks will also be removed.`}
        confirmLabel="Delete Permanently"
        isLoading={deleting}
      />
    </div>
  );
};
