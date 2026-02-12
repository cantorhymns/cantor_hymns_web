'use client';
import { useMemo } from 'react';
import { useHymns } from './useHymns';
import { useGenres } from './useGenres';
import { useCantors } from './useCantors';
import { useRecordings } from './useRecordings';
import { Hymn, Genre, Cantor, Recording } from '../types';

export interface SearchableHymn extends Hymn {
    genreNames: string[];
    cantorNames: string[];
}

export function useSearchData() {
    const { data: allHymns, isLoading: hymnsLoading } = useHymns();
    const { data: allGenres, isLoading: genresLoading } = useGenres();
    const { data: allCantors, isLoading: cantorsLoading } = useCantors();
    const { data: allRecordings, isLoading: recordingsLoading } = useRecordings();

    const isLoading = hymnsLoading || genresLoading || cantorsLoading || recordingsLoading;

    const searchableHymns = useMemo((): SearchableHymn[] | null => {
        if (isLoading || !allHymns || !allGenres || !allCantors || !allRecordings) {
            return null;
        }

        const genresMap = new Map<string, Genre>(allGenres.map(g => [g.id, g]));
        const cantorsMap = new Map<string, Cantor>(allCantors.map(c => [c.id, c]));

        const recordingsByHymnId = new Map<string, Recording[]>();
        allRecordings.forEach(rec => {
            if (!recordingsByHymnId.has(rec.hymnId)) {
                recordingsByHymnId.set(rec.hymnId, []);
            }
            recordingsByHymnId.get(rec.hymnId)!.push(rec);
        });

        return allHymns.map(hymn => {
            const genreNames = hymn.genreId.map(id => genresMap.get(id)?.name).filter(Boolean) as string[];
            
            const hymnRecordings = recordingsByHymnId.get(hymn.id) || [];
            const cantorIds = [...new Set(hymnRecordings.map(r => r.cantorId))];
            const cantorNames = cantorIds.map(id => cantorsMap.get(id)?.name).filter(Boolean) as string[];

            return {
                ...hymn,
                genreNames,
                cantorNames,
            };
        });

    }, [isLoading, allHymns, allGenres, allCantors, allRecordings]);
    
    return { data: searchableHymns, isLoading };
}
