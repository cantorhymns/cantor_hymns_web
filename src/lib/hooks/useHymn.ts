'use client';
import { useMemo } from 'react';
import { getHymn, useCatalog } from '@/lib/services/catalog';

export function useHymn(hymnId?: string) {
  const catalog = useCatalog();
  const rawHymn = useMemo(() => getHymn(hymnId), [catalog, hymnId]);

  const hymnWithRecordings = useMemo(() => {
    if (!rawHymn) return null;

    const recordings = [...(rawHymn.recordings || [])];

    recordings.sort((a, b) => {
      const aHasMarkers = (a.markers && a.markers.length > 0) || a.mode === 'learn';
      const bHasMarkers = (b.markers && b.markers.length > 0) || b.mode === 'learn';
      if (aHasMarkers && !bHasMarkers) return -1;
      if (!aHasMarkers && bHasMarkers) return 1;

      const rankA = a.cantor?.rank ?? 99;
      const rankB = b.cantor?.rank ?? 99;
      if (rankA !== rankB) return rankA - rankB;

      return (a.cantor?.name || '').localeCompare(b.cantor?.name || '');
    });

    return {
      ...rawHymn,
      recordings,
    };
  }, [rawHymn]);

  return {
    data: hymnWithRecordings,
    isLoading: false,
    error: null,
  };
}
