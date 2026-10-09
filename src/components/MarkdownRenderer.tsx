import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function extractTocHeadings(markdown: string): TocHeading[] {
  const lines = markdown.split('\n');
  const headings: TocHeading[] = [];
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      headings.push({ id, text, level: 2 });
    } else if (line.startsWith('### ')) {
      const text = line.slice(4).trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      headings.push({ id, text, level: 3 });
    }
  }
  return headings;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 text-[13px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      elements.push(
        <CodeBlock key={`code-${i}`} language={lang} code={codeLines.join('\n')} />
      );
      continue;
    }

    // H2
    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3).trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      elements.push(
        <h2
          key={`h2-${i}`}
          id={id}
          className="mt-9 mb-3 text-xl font-bold text-slate-900 dark:text-slate-50 scroll-mt-24"
        >
          {text}
        </h2>
      );
      i += 1;
      continue;
    }

    // H3
    if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4).trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      elements.push(
        <h3
          key={`h3-${i}`}
          id={id}
          className="mt-6 mb-2.5 text-base font-semibold text-slate-900 dark:text-slate-100 scroll-mt-24"
        >
          {text}
        </h3>
      );
      i += 1;
      continue;
    }

    // Blockquote (all-around hairline border, no thick left bar)
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          {renderInlineFormatting(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          className="my-4 pl-5 space-y-2 list-disc text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i += 1;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="my-4 pl-5 space-y-2 list-decimal text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="my-4 text-[15px] text-slate-700 dark:text-slate-300 leading-[1.75]"
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
    i += 1;
  }

  return <div className="max-w-[72ch]">{elements}</div>;
};
