import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Blog } from '../types';
import { userService } from '../services/userService';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BlogCard } from '../components/BlogCard';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SearchBar,
} from '../components/ui';

export const BookmarksPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  useDocumentMeta({
    title: 'Saved Bookmarks — DevScribe',
  });

  const [bookmarks, setBookmarks] = useState<Blog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getBookmarks();
      if (res.data) {
        setBookmarks(res.data);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const handleToggleLike = async (blog: Blog) => {
    try {
      if (blog.is_liked) {
        await blogService.unlikeBlog(blog.id);
      } else {
        await blogService.likeBlog(blog.id);
      }
      fetchBookmarks();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleBookmark = async (blog: Blog) => {
    setBookmarks((prev) => prev.filter((item) => item.id !== blog.id));
    try {
      await blogService.unbookmarkBlog(blog.id);
      showToast('Removed from bookmarks.', 'info');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchBookmarks();
    }
  };

  const filtered = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase()) ||
      b.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Saved Bookmarks
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Curated technical articles saved in your personal reading queue.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Filter saved articles..."
          />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBookmarks} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matching bookmarks' : 'Your bookmark list is empty'}
          description="Save articles from the Explore feed to read and reference them here."
          actionLabel="Explore Articles"
          onAction={() => navigate('/explore')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              onToggleLike={handleToggleLike}
              onToggleBookmark={handleToggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};
