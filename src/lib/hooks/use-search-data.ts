'use client';
import { useMemo } from 'react';
import { getHymns, getGenres, getCantors, getAllRecordings, useCatalog } from '@/lib/services/catalog';
import { Hymn, Genre, Cantor } from '../types';

export interface HymnSearchResult {
  hymnId: string;
  hymnName: string;
  recordingId: string;
  cantorId: string;
  cantorName: string;
  genreNames: string[];
  hymnDescription?: string;
}

export function useSearchData() {
  const catalog = useCatalog();

  const hymnSearchResults = useMemo((): HymnSearchResult[] => {
    const allHymns = getHymns();
    const allGenres = getGenres();
    const allCantors = getCantors();
    const allRecordings = getAllRecordings();

    const hymnsMap = new Map<string, Hymn>(allHymns.map(h => [h.id, h]));
    const genresMap = new Map<string, Genre>(allGenres.map(g => [g.id, g]));
    const cantorsMap = new Map<string, Cantor>(allCantors.map(c => [c.id, c]));

    const results: HymnSearchResult[] = [];

    allRecordings.forEach(recording => {
      const hymn = hymnsMap.get(recording.hymnId);
      const cantor = cantorsMap.get(recording.cantorId);

      if (hymn && cantor) {
        const genreNames = (hymn.genreId || []).map(id => genresMap.get(id)?.name).filter(Boolean) as string[];

        results.push({
          hymnId: hymn.id,
          hymnName: hymn.name,
          recordingId: recording.id,
          cantorId: cantor.id,
          cantorName: cantor.name,
          genreNames,
          hymnDescription: hymn.description,
        });
      }
    });

    return results;
  }, [catalog]);

  return { data: hymnSearchResults, hymnSearchResults, isLoading: false, error: null };
}
