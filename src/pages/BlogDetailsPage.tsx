import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Eye,
  Edit3,
  Trash2,
  Terminal,
} from 'lucide-react';
import { Blog } from '../types';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { extractTocHeadings, MarkdownRenderer } from '../components/MarkdownRenderer';
import { BlogCard } from '../components/BlogCard';
import {
  Avatar,
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingSkeleton,
} from '../components/ui';
import { formatDate, formatNumber } from '../utils/formatters';

export const BlogDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [authorBlogs, setAuthorBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useDocumentMeta({
    title: blog ? `${blog.title} — DevScribe` : 'Reading Article — DevScribe',
    description: blog?.excerpt || 'Technical article on DevScribe.',
  });

  const fetchArticle = async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setImgError(false);
    try {
      const res = await blogService.getBlogBySlug(slug);
      if (!res.data) {
        setError('Blog not found');
        return;
      }
      const current = res.data;
      setBlog(current);

      const [relatedRes, moreFromAuthorRes] = await Promise.all([
        blogService.getBlogs({ category: current.category, limit: 4 }),
        blogService.getBlogs({ author: current.author_username, limit: 4 }),
      ]);

      if (relatedRes.data) {
        setRelatedBlogs(
          relatedRes.data.items.filter((b) => b.id !== current.id).slice(0, 3)
        );
      }
      if (moreFromAuthorRes.data) {
        setAuthorBlogs(
          moreFromAuthorRes.data.items.filter((b) => b.id !== current.id).slice(0, 2)
        );
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const handleToggleLike = async () => {
    if (!blog) return;
    if (!isAuthenticated) {
      showToast('Please sign in to like articles.', 'info');
      navigate('/login');
      return;
    }

    const nextLiked = !blog.is_liked;
    const nextCount = nextLiked ? blog.likes_count + 1 : Math.max(0, blog.likes_count - 1);
    setBlog({ ...blog, is_liked: nextLiked, likes_count: nextCount });

    try {
      if (nextLiked) {
        await blogService.likeBlog(blog.id);
      } else {
        await blogService.unlikeBlog(blog.id);
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchArticle();
    }
  };

  const handleToggleBookmark = async () => {
    if (!blog) return;
    if (!isAuthenticated) {
      showToast('Please sign in to bookmark articles.', 'info');
      navigate('/login');
      return;
    }

    const nextBookmarked = !blog.is_bookmarked;
    const nextCount = nextBookmarked
      ? blog.bookmarks_count + 1
      : Math.max(0, blog.bookmarks_count - 1);
    setBlog({ ...blog, is_bookmarked: nextBookmarked, bookmarks_count: nextCount });

    try {
      if (nextBookmarked) {
        await blogService.bookmarkBlog(blog.id);
        showToast('Saved to your bookmarks.', 'success');
      } else {
        await blogService.unbookmarkBlog(blog.id);
        showToast('Removed from bookmarks.', 'info');
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchArticle();
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Article link copied to clipboard.', 'success');
  };

  const handleDelete = async () => {
    if (!blog) return;
    setDeleting(true);
    try {
      await blogService.deleteBlog(blog.id);
      showToast('Blog deleted successfully.', 'success');
      navigate('/my-blogs');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <LoadingSkeleton count={3} variant="row" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <ErrorState message={error || 'Article not found.'} onRetry={fetchArticle} />
      </div>
    );
  }

  const canModify = Boolean(user && (user.id === blog.author_id || isAdmin));
  const tocHeadings = extractTocHeadings(blog.content);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Top Back & Author Edit Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explore</span>
        </Link>

        {canModify && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/edit/${blog.id}`)}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Article</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Article & Sticky Right Table of Contents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <article className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Cover Image */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            {blog.cover_image && !imgError ? (
              <img
                src={blog.cover_image}
                alt={blog.title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full max-h-[380px] object-cover"
              />
            ) : (
              <div className="w-full h-56 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center text-slate-500">
                <Terminal className="w-8 h-8 mb-2 opacity-60" />
                <span className="text-xs font-mono">{blog.category}</span>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10">
            {/* Unboxed Metadata Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <Link
                to={`/explore?category=${encodeURIComponent(blog.category)}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {blog.category}
              </Link>
              <span aria-hidden="true">·</span>
              <span>
                {blog.status === 'draft'
                  ? 'Draft Preview'
                  : `Published ${formatDate(blog.published_at || blog.created_at)}`}
              </span>
              <span aria-hidden="true">·</span>
              <span>{blog.read_time} min read</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatNumber(blog.views)} views
              </span>
            </div>

            {/* Title & Excerpt */}
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-balance leading-tight">
              {blog.title}
            </h1>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {blog.excerpt}
            </p>

            {/* Author & Engagement Action Strip */}
            <div className="mt-6 py-4 border-y border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <Link
                to={`/author/${blog.author_username}`}
                className="flex items-center gap-3 group"
              >
                <Avatar src={blog.author_avatar} name={blog.author_name} size="md" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {blog.author_name}
                  </p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    @{blog.author_username}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2.5 tabular-nums">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    blog.is_liked
                      ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${blog.is_liked ? 'fill-current' : ''}`} />
                  <span>{formatNumber(blog.likes_count)}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    blog.is_bookmarked
                      ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${blog.is_bookmarked ? 'fill-current' : ''}`}
                  />
                  <span>{blog.is_bookmarked ? 'Saved' : 'Bookmark'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share article link"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Article Body */}
            <div className="mt-8">
              <MarkdownRenderer content={blog.content} />
            </div>

            {/* Topic Tags Links */}
            {blog.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                  Filed under:
                </span>
                {blog.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/explore?tag=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Author Card Footer */}
            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Avatar src={blog.author_avatar} name={blog.author_name} size="lg" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Written by</p>
                  <Link
                    to={`/author/${blog.author_username}`}
                    className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {blog.author_name}
                  </Link>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    @{blog.author_username}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/author/${blog.author_username}`)}
              >
                View Author Portfolio
              </Button>
            </div>
          </div>
        </article>

        {/* Right-Side Sticky Table of Contents & More from Author */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          {tocHeadings.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight">
                On This Page
              </h2>
              <nav aria-label="Table of contents" className="mt-3 space-y-2">
                {tocHeadings.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 ${
                      item.level === 3 ? 'pl-3.5' : 'font-medium'
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {authorBlogs.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
                More from {blog.author_name}
              </h2>
              <div className="mt-3.5 space-y-3.5">
                {authorBlogs.map((item) => (
                  <Link
                    key={item.id}
                    to={`/blog/${item.slug}`}
                    className="block group pt-3 first:pt-0 border-t first:border-t-0 border-slate-100 dark:border-slate-800"
                  >
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {item.category} · {item.read_time} min read
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Related Posts Section */}
      {relatedBlogs.length > 0 && (
        <section className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Related Articles in {blog.category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedBlogs.map((rel) => (
              <BlogCard key={rel.id} blog={rel} />
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Article"
        description={`Are you sure you want to permanently delete "${blog.title}"? This action cannot be undone.`}
        confirmLabel="Delete Article"
        isLoading={deleting}
      />
    </div>
  );
};
