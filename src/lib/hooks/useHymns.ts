'use client';
import { useMemo } from 'react';
import { Hymn, Recording } from '@/lib/types';
import { getHymns, useCatalog } from '@/lib/services/catalog';

export function useHymns(genreId?: string, hymnIdsFilter?: string[]) {
  const catalog = useCatalog();
  const rawHymns = useMemo(() => getHymns(genreId, hymnIdsFilter), [catalog, genreId, hymnIdsFilter]);

  const hymnsWithRecordings = useMemo(() => {
    return rawHymns.map(hymn => {
      const recordings = [...(hymn.recordings || [])];

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
        ...hymn,
        recordings,
      };
    }).filter(hymn => (hymn.recordings && hymn.recordings.length > 0) || !genreId);
  }, [rawHymns, genreId]);

  return {
    data: hymnsWithRecordings,
    isLoading: false,
    error: null,
  };
}
