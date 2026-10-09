export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Unpublished';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return String(isoString);
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num || 0);
}

export function slugifyPreview(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const CATEGORIES = [
  'Backend',
  'Database',
  'Frontend',
  'Security',
  'Testing',
  'DevOps',
  'Architecture',
] as const;

export const COVER_PRESETS = [
  {
    label: 'Distributed API Gateway',
    url: '/src/assets/images/cover_fastapi_architecture_1791541033807.jpg',
  },
  {
    label: 'B-Tree Storage Cluster',
    url: '/src/assets/images/cover_mongodb_indexing_1791541045277.jpg',
  },
  {
    label: 'Concurrent UI Scheduler',
    url: '/src/assets/images/cover_react_performance_1791541055240.jpg',
  },
] as const;

export const AVATAR_PRESETS = [
  {
    label: 'Alex Profile Studio',
    url: '/src/assets/images/avatar_alex_rivera_1791541068236.jpg',
  },
  {
    label: 'Elena Profile Studio',
    url: '/src/assets/images/avatar_elena_rostova_1791541078393.jpg',
  },
] as const;
