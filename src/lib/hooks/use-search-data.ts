'use client';
import { useMemo } from 'react';
import { useHymns } from './useHymns';
import { useGenres } from './useGenres';
import { useCantors } from './useCantors';
import { useRecordings } from './useRecordings';
import { Hymn, Genre, Cantor, Recording } from '../types';

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
    const { data: allHymns, isLoading: hymnsLoading } = useHymns();
    const { data: allGenres, isLoading: genresLoading } = useGenres();
    const { data: allCantors, isLoading: cantorsLoading } = useCantors();
    const { data: allRecordings, isLoading: recordingsLoading } = useRecordings();

    const isLoading = hymnsLoading || genresLoading || cantorsLoading || recordingsLoading;

    const hymnSearchResults = useMemo((): HymnSearchResult[] | null => {
        if (isLoading || !allHymns || !allGenres || !allCantors || !allRecordings) {
            return null;
        }

        const hymnsMap = new Map<string, Hymn>(allHymns.map(h => [h.id, h]));
        const genresMap = new Map<string, Genre>(allGenres.map(g => [g.id, g]));
        const cantorsMap = new Map<string, Cantor>(allCantors.map(c => [c.id, c]));

        const results: HymnSearchResult[] = [];

        allRecordings.forEach(recording => {
            const hymn = hymnsMap.get(recording.hymnId);
            const cantor = cantorsMap.get(recording.cantorId);

            if (hymn && cantor) {
                const genreNames = hymn.genreId.map(id => genresMap.get(id)?.name).filter(Boolean) as string[];

                results.push({
                    hymnId: hymn.id,
                    hymnName: hymn.name,
                    recordingId: recording.id,
                    cantorId: cantor.id,
                    cantorName: cantor.name,
                    genreNames: genreNames,
                    hymnDescription: hymn.description
                });
            }
        });
        
        return results;

    }, [isLoading, allHymns, allGenres, allCantors, allRecordings]);
    
    return { data: hymnSearchResults, isLoading };
}
