'use client';
import { useMemo } from 'react';
import { Hymn } from '@/lib/types';
import { useFileContent } from './useFileContent';
import { getHymn } from '@/lib/services/catalog';

const CANTORS_ORDER_FILE_PATH = 'tracks/cantors_order.txt';

export function useHymn(hymnId?: string) {
  const { content: cantorsOrderFile, isLoading: isCantorsOrderLoading, error: cantorsOrderError } = useFileContent(CANTORS_ORDER_FILE_PATH);

  const rawHymn = useMemo(() => getHymn(hymnId), [hymnId]);

  const cantorsOrder = useMemo(() => {
    if (!cantorsOrderFile) return [];
    return cantorsOrderFile.split('\n').map(id => id.trim()).filter(Boolean);
  }, [cantorsOrderFile]);

  const hymnWithRecordings = useMemo(() => {
    if (!rawHymn) return null;

    const recordings = [...(rawHymn.recordings || [])];

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
      ...rawHymn,
      recordings,
    };
  }, [rawHymn, cantorsOrder]);

  return {
    data: hymnWithRecordings,
    isLoading: isCantorsOrderLoading,
    error: cantorsOrderError,
  };
}
