import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, RotateCcw } from 'lucide-react';
import { Blog } from '../types';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { BlogCard } from '../components/BlogCard';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PaginationControl,
  SearchBar,
  Select,
} from '../components/ui';
import { CATEGORIES } from '../utils/formatters';

const POPULAR_TAGS = [
  'fastapi',
  'mongodb',
  'python',
  'react',
  'typescript',
  'security',
  'indexing',
  'pytest',
  'docker',
  'architecture',
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useDocumentMeta({
    title: 'Explore Blogs — DevScribe',
    description: 'Search and filter technical articles by category, tag, author, and readership.',
  });

  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'All');
  const [selectedTag, setSelectedTag] = useState<string>(searchParams.get('tag') || '');
  const [selectedAuthor, setSelectedAuthor] = useState<string>(searchParams.get('author') || '');
  const [sort, setSort] = useState<'latest' | 'views' | 'likes'>(
    (searchParams.get('sort') as 'latest' | 'views' | 'likes') || 'latest'
  );
  const [page, setPage] = useState<number>(
    Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  );
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const debouncedSearch = useDebounce(search, 300);

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExploreBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await blogService.getBlogs({
        page,
        limit: 6,
        search: debouncedSearch || undefined,
        category: category !== 'All' ? category : undefined,
        tag: selectedTag || undefined,
        author: selectedAuthor || undefined,
        sort,
      });

      if (response.data) {
        setBlogs(response.data.items);
        setTotal(response.data.total);
        setPages(response.data.pages);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, selectedTag, selectedAuthor, sort]);

  useEffect(() => {
    fetchExploreBlogs();
  }, [fetchExploreBlogs]);

  useEffect(() => {
    const nextParams: Record<string, string> = {};
    if (debouncedSearch) nextParams.search = debouncedSearch;
    if (category && category !== 'All') nextParams.category = category;
    if (selectedTag) nextParams.tag = selectedTag;
    if (selectedAuthor) nextParams.author = selectedAuthor;
    if (sort !== 'latest') nextParams.sort = sort;
    if (page > 1) nextParams.page = String(page);
    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearch, category, selectedTag, selectedAuthor, sort, page, setSearchParams]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('All');
    setSelectedTag('');
    setSelectedAuthor('');
    setSort('latest');
    setPage(1);
  };

  const handleToggleLike = async (blog: Blog) => {
    if (!isAuthenticated) {
      showToast('Please sign in to like articles.', 'info');
      navigate('/login');
      return;
    }
    const nextLiked = !blog.is_liked;
    const nextCount = nextLiked ? blog.likes_count + 1 : Math.max(0, blog.likes_count - 1);
    setBlogs((prev) =>
      prev.map((b) =>
        b.id === blog.id ? { ...b, is_liked: nextLiked, likes_count: nextCount } : b
      )
    );
    try {
      if (nextLiked) {
        await blogService.likeBlog(blog.id);
      } else {
        await blogService.unlikeBlog(blog.id);
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchExploreBlogs();
    }
  };

  const handleToggleBookmark = async (blog: Blog) => {
    if (!isAuthenticated) {
      showToast('Please sign in to bookmark articles.', 'info');
      navigate('/login');
      return;
    }
    const nextBookmarked = !blog.is_bookmarked;
    setBlogs((prev) =>
      prev.map((b) => (b.id === blog.id ? { ...b, is_bookmarked: nextBookmarked } : b))
    );
    try {
      if (nextBookmarked) {
        await blogService.bookmarkBlog(blog.id);
        showToast('Saved to bookmarks.', 'success');
      } else {
        await blogService.unbookmarkBlog(blog.id);
        showToast('Removed from bookmarks.', 'info');
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
      fetchExploreBlogs();
    }
  };

  const hasActiveFilters =
    Boolean(search) ||
    category !== 'All' ||
    Boolean(selectedTag) ||
    Boolean(selectedAuthor) ||
    sort !== 'latest';

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Explore Blogs
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Discover peer-reviewed engineering guides, system architecture notes, and tutorials.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLayout('grid')}
                aria-label="Grid layout"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  layout === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayout('list')}
                aria-label="List layout"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  layout === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-5">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search articles by title, topic, or content..."
            />
          </div>

          <div className="md:col-span-3">
            <Select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
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
              aria-label="Filter by author"
              value={selectedAuthor}
              onChange={(e) => {
                setSelectedAuthor(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Authors' },
                { value: 'elena_admin', label: 'Elena Rostova' },
                { value: 'alex_rivera', label: 'Alex Rivera' },
                { value: 'marcus_vance', label: 'Marcus Vance' },
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
                { value: 'views', label: 'Sort: Most Viewed' },
                { value: 'likes', label: 'Sort: Most Liked' },
              ]}
            />
          </div>
        </div>

        {/* Interactive Tag Filter Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
              Topic Tags:
            </span>
            {POPULAR_TAGS.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(active ? '' : tag);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Results Area */}
      {loading ? (
        <LoadingSkeleton count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchExploreBlogs} />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="No matching articles found"
          description="Try clearing your search query or switching to a broader topic category."
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <>
          <div
            className={
              layout === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {blogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                layout={layout}
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
          </div>

          <PaginationControl
            page={page}
            pages={pages}
            total={total}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}
    </div>
  );
};
