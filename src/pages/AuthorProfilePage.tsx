import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Globe, ExternalLink, Calendar } from 'lucide-react';
import { AuthorProfile, Blog } from '../types';
import { userService } from '../services/userService';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BlogCard } from '../components/BlogCard';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '../components/ui';
import { formatDate, formatNumber } from '../utils/formatters';

export const AuthorProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta({
    title: profile
      ? `${profile.name} (@${profile.username}) — DevScribe`
      : 'Author Profile — DevScribe',
    description: profile?.bio || 'Developer portfolio and published articles on DevScribe.',
  });

  const fetchProfile = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getAuthorProfile(username);
      if (res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleToggleLike = async (blog: Blog) => {
    if (!isAuthenticated) {
      showToast('Please sign in to like articles.', 'info');
      navigate('/login');
      return;
    }
    try {
      if (blog.is_liked) {
        await blogService.unlikeBlog(blog.id);
      } else {
        await blogService.likeBlog(blog.id);
      }
      fetchProfile();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleBookmark = async (blog: Blog) => {
    if (!isAuthenticated) {
      showToast('Please sign in to bookmark articles.', 'info');
      navigate('/login');
      return;
    }
    try {
      if (blog.is_bookmarked) {
        await blogService.unbookmarkBlog(blog.id);
        showToast('Removed from bookmarks.', 'info');
      } else {
        await blogService.bookmarkBlog(blog.id);
        showToast('Saved to bookmarks.', 'success');
      }
      fetchProfile();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <ErrorState message={error || 'Author profile not found.'} onRetry={fetchProfile} />
      </div>
    );
  }

  const isOwnProfile = Boolean(user && user.username === profile.username);
  const filteredBlogs =
    selectedCategory === 'All'
      ? profile.blogs
      : profile.blogs.filter((b) => b.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Developer Portfolio Header Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar src={profile.avatar} name={profile.name} size="xl" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.name}
                </h1>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  @{profile.username}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {profile.bio || 'Software engineer and technical author on DevScribe.'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(profile.created_at)}
                </span>
                {profile.social_links?.website && (
                  <a
                    href={profile.social_links.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
                {profile.social_links?.github && (
                  <a
                    href={profile.social_links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {profile.social_links?.x && (
                  <a
                    href={profile.social_links.x}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    <span>X / Twitter</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              Customize Profile
            </Button>
          )}
        </div>

        {/* Portfolio Metrics Bar */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Published Articles</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {formatNumber(profile.stats.blog_count)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Readership Views</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {formatNumber(profile.stats.total_views)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Article Likes</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {formatNumber(profile.stats.total_likes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Primary Domains</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {profile.stats.categories.join(' · ') || 'General'}
            </p>
          </div>
        </div>
      </section>

      {/* Author's Published Articles & Category Filter */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Published Articles ({filteredBlogs.length})
          </h2>

          {profile.stats.categories.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              {['All', ...profile.stats.categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredBlogs.length === 0 ? (
          <EmptyState
            title="No published articles yet"
            description="This author has not published any articles in this category yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
