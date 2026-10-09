import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  List,
  Quote,
  Save,
  Send,
  ArrowLeft,
  Columns,
  Eye,
  Edit3,
} from 'lucide-react';
import { BlogStatus } from '../types';
import { blogService } from '../services/blogService';
import { extractErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Button, Input, Select, Textarea } from '../components/ui';
import { CATEGORIES, COVER_PRESETS, slugifyPreview } from '../utils/formatters';

export const BlogEditorPage: React.FC = () => {
  const { blogId } = useParams<{ blogId?: string }>();
  const isEditMode = Boolean(blogId);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useDocumentMeta({
    title: isEditMode ? 'Edit Article — DevScribe' : 'Create Article — DevScribe',
  });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState<string>(COVER_PRESETS[0].url);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState('fastapi, mongodb, architecture');
  const [content, setContent] = useState(
    `## Overview\n\nWrite your technical analysis, benchmarks, or architectural pattern here.\n\n\`\`\`python\nasync def example_handler():\n    return {"status": "ok"}\n\`\`\`\n\n### Key Takeaways\n\n- Keep route handlers modular and thin.\n- Enforce strict Pydantic request validation.`
  );
  const [editorMode, setEditorMode] = useState<'split' | 'write' | 'preview'>('split');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingInitial, setLoadingInitial] = useState<boolean>(isEditMode);
  const [savingStatus, setSavingStatus] = useState<BlogStatus | null>(null);

  useEffect(() => {
    if (!blogId) return;
    const loadExisting = async () => {
      setLoadingInitial(true);
      try {
        const res = await blogService.getBlogById(blogId);
        if (res.data) {
          const b = res.data;
          setTitle(b.title);
          setSlug(b.slug);
          setSlugManuallyEdited(true);
          setExcerpt(b.excerpt);
          setCoverImage(b.cover_image || COVER_PRESETS[0].url);
          setCategory(b.category);
          setTagsInput(b.tags.join(', '));
          setContent(b.content);
        }
      } catch (err) {
        showToast(extractErrorMessage(err), 'error');
        navigate('/my-blogs');
      } finally {
        setLoadingInitial(false);
      }
    };
    loadExisting();
  }, [blogId, navigate, showToast]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManuallyEdited) {
      setSlug(slugifyPreview(val));
    }
  };

  const insertSnippet = (snippet: string) => {
    setContent((prev) => `${prev}\n${snippet}`);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (title.trim().length < 3) {
      nextErrors.title = 'Title must be at least 3 characters.';
    }
    if (excerpt.trim().length < 10) {
      nextErrors.excerpt = 'Excerpt must be at least 10 characters.';
    }
    if (content.trim().length < 20) {
      nextErrors.content = 'Article content must be at least 20 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (targetStatus: BlogStatus) => {
    if (!validate()) {
      showToast('Please fix validation errors before saving.', 'error');
      return;
    }

    setSavingStatus(targetStatus);
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (isEditMode && blogId) {
        const res = await blogService.updateBlog(blogId, {
          title: title.trim(),
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim(),
          content,
          cover_image: coverImage.trim(),
          category,
          tags: parsedTags,
          status: targetStatus,
        });
        showToast(
          targetStatus === 'published'
            ? 'Blog published successfully.'
            : 'Draft updated successfully.',
          'success'
        );
        if (res.data) {
          navigate(targetStatus === 'published' ? `/blog/${res.data.slug}` : '/my-blogs');
        }
      } else {
        const res = await blogService.createBlog({
          title: title.trim(),
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim(),
          content,
          cover_image: coverImage.trim(),
          category,
          tags: parsedTags,
          status: targetStatus,
        });
        showToast(
          targetStatus === 'published'
            ? 'Blog published successfully.'
            : 'Draft saved successfully.',
          'success'
        );
        if (res.data) {
          navigate(targetStatus === 'published' ? `/blog/${res.data.slug}` : '/drafts');
        }
      }
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSavingStatus(null);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading article into editor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Technical Article' : 'Draft New Technical Article'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              /blog/{slug || 'auto-generated-slug'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave('draft')}
            isLoading={savingStatus === 'draft'}
            disabled={savingStatus !== null}
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave('published')}
            isLoading={savingStatus === 'published'}
            disabled={savingStatus !== null}
          >
            <Send className="w-4 h-4" />
            <span>Publish</span>
          </Button>
        </div>
      </div>

      {/* Article Metadata Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <Input
              label="Article Title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Building REST APIs with FastAPI and Motor"
              error={errors.title}
            />
          </div>

          <div className="md:col-span-5">
            <Input
              label="SEO URL Slug"
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setSlug(slugifyPreview(e.target.value));
              }}
              placeholder="building-rest-apis-with-fastapi"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <Textarea
          label="Short Excerpt / Summary"
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Concise 1–2 sentence summary displayed on feed cards and OpenGraph tags..."
          error={errors.excerpt}
        />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-3">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>

          <div className="md:col-span-4">
            <Input
              label="Tags (comma-separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="fastapi, python, mongodb"
              className="font-mono text-xs"
            />
          </div>

          <div className="md:col-span-5 space-y-2">
            <Input
              label="Cover Image URL"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="/src/assets/images/..."
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Studio Presets:</span>
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setCoverImage(preset.url)}
                  className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                    coverImage === preset.url
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Markdown Workspace Editor + Live Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* Formatting & View Mode Toolbar */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertSnippet('## Section Heading')}
              title="Insert H2 Heading"
              className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('### Subsection Heading')}
              title="Insert H3 Heading"
              className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Heading3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('**bold emphasis**')}
              title="Insert Bold Text"
              className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('- List item one\n- List item two')}
              title="Insert Bullet List"
              className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertSnippet('> Architectural insight or benchmark note.')}
              title="Insert Callout Quote"
              className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                insertSnippet('```python\nasync def fetch_items():\n    pass\n```')
              }
              title="Insert Code Block"
              className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setEditorMode('write')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                editorMode === 'write'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('split')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                editorMode === 'split'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('preview')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                editorMode === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Full Preview</span>
            </button>
          </div>
        </div>

        {errors.content && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {errors.content}
          </div>
        )}

        {/* Editor & Live Preview Panes */}
        <div
          className={`grid grid-cols-1 ${
            editorMode === 'split' ? 'lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x' : ''
          } divide-slate-200 dark:divide-slate-800 min-h-[460px]`}
        >
          {(editorMode === 'write' || editorMode === 'split') && (
            <div className="flex flex-col">
              <textarea
                aria-label="Markdown Content Editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in Markdown..."
                className="w-full flex-1 min-h-[460px] p-5 font-mono text-sm bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none resize-y leading-relaxed"
              />
            </div>
          )}

          {(editorMode === 'preview' || editorMode === 'split') && (
            <div className="p-6 bg-slate-50/40 dark:bg-slate-950/40 overflow-y-auto max-h-[640px]">
              <p className="text-[11px] font-mono text-slate-400 mb-4">
                Live Article Preview
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {title || 'Untitled Technical Article'}
              </h2>
              {excerpt && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {excerpt}
                </p>
              )}
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
