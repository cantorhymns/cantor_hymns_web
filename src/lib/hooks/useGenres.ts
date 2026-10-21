'use client';
import { useMemo } from 'react';
import { Genre } from '@/lib/types';
import { useFileContent } from './useFileContent';
import { getGenres, getGenre, useCatalog } from '@/lib/services/catalog';

const GENRES_ORDER_FILE_PATH = 'genres/genres_order.txt';

export function useGenres() {
  const catalog = useCatalog();
  const { content: orderFileContent, isLoading: isOrderLoading, error: orderFileError } = useFileContent(GENRES_ORDER_FILE_PATH);

  const activeGenres = useMemo(() => getGenres(), [catalog]);

  const processedGenres = useMemo(() => {
    if (!orderFileContent) {
      return [...activeGenres].sort((a, b) => a.name.localeCompare(b.name));
    }

    const orderedIds = orderFileContent.split('\n').map(id => id.trim()).filter(Boolean);
    const orderedIdSet = new Set(orderedIds);

    const orderedFromFile: Genre[] = [];
    const notInFile: Genre[] = [];

    activeGenres.forEach(genre => {
      if (orderedIdSet.has(genre.id)) {
        orderedFromFile.push(genre);
      } else {
        notInFile.push(genre);
      }
    });

    orderedFromFile.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
    notInFile.sort((a, b) => a.name.localeCompare(b.name));

    return [...orderedFromFile, ...notInFile];
  }, [activeGenres, orderFileContent]);

  return { data: processedGenres, isLoading: isOrderLoading, error: orderFileError };
}

export function useGenre(genreId?: string) {
  const catalog = useCatalog();
  const genre = useMemo(() => getGenre(genreId), [catalog, genreId]);
  return { data: genre, isLoading: false, error: null };
}
