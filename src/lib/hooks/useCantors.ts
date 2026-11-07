'use client';
import { useMemo } from 'react';
import { getCantors, useCatalog } from '@/lib/services/catalog';

export function useCantors() {
  const catalog = useCatalog();
  const allCantors = useMemo(() => getCantors(), [catalog]);

  const processedCantors = useMemo(() => {
    return [...allCantors].sort((a, b) => {
      const rankA = a.rank ?? 99;
      const rankB = b.rank ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });
  }, [allCantors]);

  return { data: processedCantors, isLoading: false, error: null };
}
