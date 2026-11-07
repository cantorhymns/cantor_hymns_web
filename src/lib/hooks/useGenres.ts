'use client';
import { useMemo } from 'react';
import { getGenres, getGenre, useCatalog } from '@/lib/services/catalog';

export function useGenres() {
  const catalog = useCatalog();
  const activeGenres = useMemo(() => getGenres(), [catalog]);

  const processedGenres = useMemo(() => {
    return [...activeGenres].sort((a, b) => {
      const rankA = a.rank ?? 99;
      const rankB = b.rank ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });
  }, [activeGenres]);

  return { data: processedGenres, isLoading: false, error: null };
}

export function useGenre(genreId?: string) {
  const catalog = useCatalog();
  const genre = useMemo(() => getGenre(genreId), [catalog, genreId]);
  return { data: genre, isLoading: false, error: null };
}
