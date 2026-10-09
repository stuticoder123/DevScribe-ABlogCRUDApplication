import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Bookmark, Eye, Terminal } from 'lucide-react';
import { Blog } from '../types';
import { Avatar } from './ui';
import { formatDate, formatNumber } from '../utils/formatters';

interface BlogCardProps {
  blog: Blog;
  layout?: 'grid' | 'list';
  onToggleLike?: (blog: Blog) => void;
  onToggleBookmark?: (blog: Blog) => void;
}

export const BlogCard: React.FC<BlogCardProps> = ({
  blog,
  layout = 'grid',
  onToggleLike,
  onToggleBookmark,
}) => {
  const [imgError, setImgError] = useState(false);

  const renderCover = (heightClass: string) => {
    if (blog.cover_image && !imgError) {
      return (
        <img
          src={blog.cover_image}
          alt={blog.title}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full ${heightClass} object-cover transition-transform duration-200 group-hover:scale-[1.02]`}
        />
      );
    }
    return (
      <div
        className={`w-full ${heightClass} bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-4 text-slate-500 dark:text-slate-400`}
      >
        <Terminal className="w-6 h-6 mb-2 opacity-70" />
        <span className="text-xs font-mono text-center line-clamp-1">{blog.category}</span>
      </div>
    );
  };

  if (layout === 'list') {
    return (
      <article className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 flex flex-col md:flex-row gap-6 items-start">
        <Link
          to={`/blog/${blog.slug}`}
          className="w-full md:w-64 shrink-0 overflow-hidden rounded-lg border border-slate-200/70 dark:border-slate-800"
        >
          {renderCover('h-44 md:h-36')}
        </Link>

        <div className="flex-1 min-w-0 flex flex-col justify-between w-full">
          <div>
            {/* Zero-Pill Metadata Discipline: Clean unboxed text with middot separators */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {blog.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatDate(blog.published_at || blog.created_at)}</span>
              <span aria-hidden="true">·</span>
              <span>{blog.read_time} min read</span>
              {blog.tags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {blog.tags.slice(0, 3).join(' / ')}
                  </span>
                </>
              )}
            </div>

            <Link to={`/blog/${blog.slug}`} className="block mt-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                {blog.title}
              </h3>
            </Link>

            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {blog.excerpt}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
            <Link
              to={`/author/${blog.author_username}`}
              className="flex items-center gap-2.5 group/author min-w-0"
            >
              <Avatar src={blog.author_avatar} name={blog.author_name} size="xs" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover/author:text-slate-900 dark:group-hover/author:text-white truncate">
                {blog.author_name}
              </span>
            </Link>

            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
              <span className="inline-flex items-center gap-1" title="Views">
                <Eye className="w-3.5 h-3.5" />
                {formatNumber(blog.views)}
              </span>

              <button
                type="button"
                onClick={() => onToggleLike?.(blog)}
                aria-label={blog.is_liked ? 'Unlike article' : 'Like article'}
                className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  blog.is_liked
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : 'hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${blog.is_liked ? 'fill-current' : ''}`} />
                <span>{formatNumber(blog.likes_count)}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleBookmark?.(blog)}
                aria-label={blog.is_bookmarked ? 'Remove bookmark' : 'Bookmark article'}
                className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  blog.is_bookmarked
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${blog.is_bookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <div>
        <Link
          to={`/blog/${blog.slug}`}
          className="block overflow-hidden border-b border-slate-100 dark:border-slate-800"
        >
          {renderCover('h-44')}
        </Link>

        <div className="p-5">
          {/* Zero-Pill Metadata Discipline: Clean unboxed text with middot separators */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {blog.category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(blog.published_at || blog.created_at)}</span>
            <span aria-hidden="true">·</span>
            <span>{blog.read_time} min read</span>
          </div>

          <Link to={`/blog/${blog.slug}`} className="block mt-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
              {blog.title}
            </h3>
          </Link>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {blog.excerpt}
          </p>
        </div>
      </div>

      <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        <Link
          to={`/author/${blog.author_username}`}
          className="flex items-center gap-2 min-w-0 group/author"
        >
          <Avatar src={blog.author_avatar} name={blog.author_name} size="xs" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover/author:text-slate-900 dark:group-hover/author:text-white truncate">
            {blog.author_name}
          </span>
        </Link>

        <div className="flex items-center gap-3.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          <span className="inline-flex items-center gap-1" title="Views">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(blog.views)}
          </span>

          <button
            type="button"
            onClick={() => onToggleLike?.(blog)}
            aria-label={blog.is_liked ? 'Unlike article' : 'Like article'}
            className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
              blog.is_liked
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${blog.is_liked ? 'fill-current' : ''}`} />
            <span>{formatNumber(blog.likes_count)}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark?.(blog)}
            aria-label={blog.is_bookmarked ? 'Remove bookmark' : 'Bookmark article'}
            className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
              blog.is_bookmarked
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${blog.is_bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
};
