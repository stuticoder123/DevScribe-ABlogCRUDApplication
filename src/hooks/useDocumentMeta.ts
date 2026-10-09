import { useEffect } from 'react';

interface DocumentMetaOptions {
  title: string;
  description?: string;
}

export function useDocumentMeta({ title, description }: DocumentMetaOptions): void {
  useEffect(() => {
    const fullTitle = title.includes('DevScribe') ? title : `${title} — DevScribe`;
    document.title = fullTitle;

    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', fullTitle);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
    }
  }, [title, description]);
}
