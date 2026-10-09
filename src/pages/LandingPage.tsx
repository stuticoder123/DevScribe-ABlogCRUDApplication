import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, PenTool, Users, Eye } from 'lucide-react';
import { Blog } from '../types';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BlogCard } from '../components/BlogCard';
import { Avatar, Button, ErrorState, LoadingSkeleton } from '../components/ui';
import { CATEGORIES, formatNumber } from '../utils/formatters';

const FEATURED_AUTHORS = [
  {
    name: 'Elena Rostova',
    username: 'elena_admin',
    role: 'Principal Distributed Systems Architect',
    avatar: '/src/assets/images/avatar_elena_rostova_1791541078393.jpg',
    bio: 'Maintainer of open-source async Python tooling, high-density storage engines, and system telemetry platforms.',
    articlesCount: 3,
    totalViews: '4.8k',
  },
  {
    name: 'Alex Rivera',
    username: 'alex_rivera',
    role: 'Lead Backend Systems Engineer',
    avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
    bio: 'Specializing in FastAPI, asynchronous Python runtimes, and MongoDB compound index optimization.',
    articlesCount: 4,
    totalViews: '3.6k',
  },
  {
    name: 'Marcus Vance',
    username: 'marcus_vance',
    role: 'Staff Frontend & Design Systems Engineer',
    avatar: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
    bio: 'Building zero-latency developer workspaces with React, TypeScript, and deterministic UI scheduling.',
    articlesCount: 2,
    totalViews: '2.3k',
  },
];

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useDocumentMeta({
    title: 'DevScribe — Write. Publish. Build your audience.',
    description:
      'A structured developer publishing platform and engineering knowledge workspace powered by FastAPI and MongoDB.',
  });

  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([]);
  const [trendingBlogs, setTrendingBlogs] = useState<Blog[]>([]);
  const [totalPublished, setTotalPublished] = useState<number>(8);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fetchLandingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestRes, trendingRes] = await Promise.all([
        blogService.getBlogs({ page: 1, limit: 6, sort: 'latest' }),
        blogService.getBlogs({ page: 1, limit: 3, sort: 'views' }),
      ]);
      if (latestRes.data) {
        setLatestBlogs(latestRes.data.items);
        setTotalPublished(latestRes.data.total);
      }
      if (trendingRes.data) {
        setTrendingBlogs(trendingRes.data.items);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingData();
  }, []);

  const handleToggleLike = async (blog: Blog) => {
    if (!isAuthenticated) {
      showToast('Please sign in to like articles.', 'info');
      navigate('/login');
      return;
    }
    const optimisticLiked = !blog.is_liked;
    const optimisticCount = optimisticLiked ? blog.likes_count + 1 : Math.max(0, blog.likes_count - 1);

    const updateList = (list: Blog[]) =>
      list.map((item) =>
        item.id === blog.id
          ? { ...item, is_liked: optimisticLiked, likes_count: optimisticCount }
          : item
      );

    setLatestBlogs(updateList);
    setTrendingBlogs(updateList);

    try {
      if (optimisticLiked) {
        await blogService.likeBlog(blog.id);
      } else {
        await blogService.unlikeBlog(blog.id);
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchLandingData();
    }
  };

  const handleToggleBookmark = async (blog: Blog) => {
    if (!isAuthenticated) {
      showToast('Please sign in to bookmark articles.', 'info');
      navigate('/login');
      return;
    }
    const optimisticBookmarked = !blog.is_bookmarked;
    const updateList = (list: Blog[]) =>
      list.map((item) =>
        item.id === blog.id ? { ...item, is_bookmarked: optimisticBookmarked } : item
      );

    setLatestBlogs(updateList);
    setTrendingBlogs(updateList);

    try {
      if (optimisticBookmarked) {
        await blogService.bookmarkBlog(blog.id);
        showToast('Article saved to bookmarks.', 'success');
      } else {
        await blogService.unbookmarkBlog(blog.id);
        showToast('Removed from bookmarks.', 'info');
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchLandingData();
    }
  };

  const filteredLatest =
    selectedCategory === 'All'
      ? latestBlogs
      : latestBlogs.filter((b) => b.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="space-y-16 pb-8">
      {/* Hero Section */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Developer Publishing & Engineering Knowledge Platform
              </p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight text-balance leading-[1.12]">
                Write. Publish. Build your audience.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Draft architectural deep-dives with live Markdown preview, organize technical knowledge by topic, and track readership analytics in a distraction-free developer workspace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(isAuthenticated ? '/create' : '/register')}
                >
                  <span>Start Writing</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/explore')}
                >
                  <span>Explore Blogs</span>
                </Button>
              </div>
            </div>

            {/* Right Column: Featured Lead Article Preview Card */}
            <div className="lg:col-span-5 flex">
              <div className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 mb-4">
                    <img
                      src="/src/assets/images/cover_fastapi_architecture_1791541033807.jpg"
                      alt="Distributed FastAPI Architecture"
                      referrerPolicy="no-referrer"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      Featured Architecture Guide
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>FastAPI & Motor</span>
                  </div>
                  <Link
                    to="/blog/architecting-high-throughput-rest-apis-with-fastapi-and-motor"
                    className="block mt-1.5"
                  >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Architecting High-Throughput REST APIs with FastAPI and Motor
                    </h2>
                  </Link>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    Non-blocking I/O, connection pool sizing, and structured dependency injection for production Python services.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <Link
                    to="/author/alex_rivera"
                    className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200"
                  >
                    <Avatar
                      src="/src/assets/images/avatar_alex_rivera_1791541068236.jpg"
                      name="Alex Rivera"
                      size="xs"
                    />
                    <span>Alex Rivera</span>
                  </Link>
                  <Link
                    to="/blog/architecting-high-throughput-rest-apis-with-fastapi-and-motor"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Read article →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-column Platform Statistics Strip below the hero split */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatNumber(totalPublished)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Published Engineering Guides
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  10,860+
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monthly Technical Reads
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  7 Domains
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Backend, DB, Frontend, Security & DevOps
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  100% Verified
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  JWT & Role-Protected Author Workspaces
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Blogs Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Trending Articles
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Most read system design and implementation deep-dives across the platform.
            </p>
          </div>
          <Link
            to="/explore?sort=views"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
          >
            View all by readership →
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLandingData} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingBlogs.map((blog) => (
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

      {/* Popular Categories + Latest Articles */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Latest Publications
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Filter recent engineering articles by domain category.
            </p>
          </div>

          {/* Interactive Category Segmented Filter Controls */}
          <div
            role="tablist"
            aria-label="Filter latest articles by category"
            className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto"
          >
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLatest.map((blog) => (
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

      {/* Featured Authors Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Featured Engineering Authors
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Explore developer portfolios and published technical collections.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_AUTHORS.map((author) => (
            <Link
              key={author.username}
              to={`/author/${author.username}`}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3.5">
                  <Avatar src={author.avatar} name={author.name} size="md" />
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {author.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      @{author.username}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {author.role}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {author.bio}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  {author.articlesCount} Published · {author.totalViews} Views
                </span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  View Profile →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
