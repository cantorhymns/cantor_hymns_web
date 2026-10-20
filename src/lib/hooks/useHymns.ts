'use client';
import { useMemo } from 'react';
import { Hymn, Recording } from '@/lib/types';
import { useFileContent } from './useFileContent';
import { getHymns } from '@/lib/services/catalog';

const CANTORS_ORDER_FILE_PATH = 'tracks/cantors_order.txt';

export function useHymns(genreId?: string, hymnIdsFilter?: string[]) {
  const { content: cantorsOrderFile, isLoading: isCantorsOrderLoading, error: cantorsOrderError } = useFileContent(CANTORS_ORDER_FILE_PATH);

  const rawHymns = useMemo(() => getHymns(genreId, hymnIdsFilter), [genreId, hymnIdsFilter]);

  const cantorsOrder = useMemo(() => {
    if (!cantorsOrderFile) return [];
    return cantorsOrderFile.split('\n').map(id => id.trim()).filter(Boolean);
  }, [cantorsOrderFile]);

  const hymnsWithRecordings = useMemo(() => {
    return rawHymns.map(hymn => {
      const recordings = [...(hymn.recordings || [])];

      recordings.sort((a, b) => {
        if (a.mode === 'learn' && b.mode !== 'learn') return -1;
        if (a.mode !== 'learn' && b.mode === 'learn') return 1;

        const aId = a.cantorId;
        const bId = b.cantorId;
        const indexA = cantorsOrder.indexOf(aId);
        const indexB = cantorsOrder.indexOf(bId);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return (a.cantor?.name || '').localeCompare(b.cantor?.name || '');
      });

      return {
        ...hymn,
        recordings,
      };
    }).filter(hymn => (hymn.recordings && hymn.recordings.length > 0) || !genreId);
  }, [rawHymns, cantorsOrder, genreId]);

  return {
    data: hymnsWithRecordings,
    isLoading: isCantorsOrderLoading,
    error: cantorsOrderError,
  };
}
