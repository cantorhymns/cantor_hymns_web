
'use client';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Hymn, Recording, Cantor } from '@/lib/types';

export function useHymns(genreId?: string, hymnIdsFilter?: string[]) {
  const firestore = useFirestore();

  const hymnsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (genreId) {
        return query(collection(firestore, 'hymns'), where('genreId', 'array-contains', genreId));
    }
    if (hymnIdsFilter && hymnIdsFilter.length > 0) {
        // Limited to 30 hymnIds
        return query(collection(firestore, 'hymns'), where('__name__', 'in', hymnIdsFilter.slice(0, 30)));
    }
    // If no genreId or filter, fetch all hymns.
    return collection(firestore, 'hymns');
  }, [firestore, genreId, hymnIdsFilter]);

  const { data: hymns, isLoading: areHymnsLoading, error: hymnsError } = useCollection<Hymn>(hymnsQuery);

  const hymnIds = useMemo(() => hymns?.map(h => h.id) || [], [hymns]);
  
  const shouldFetchRelatedData = !!genreId || (!!hymnIdsFilter && hymnIdsFilter.length > 0);

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || hymnIds.length === 0 || !shouldFetchRelatedData) return null;
    // Firestore 'in' query is limited to 30 items. If you expect more, you'll need to batch queries.
    // Fetch only active recordings for the hymns.
    return query(collection(firestore, 'recordings'), where('hymnId', 'in', hymnIds.slice(0,30)), where('active', '==', true));
  }, [firestore, hymnIds, shouldFetchRelatedData]);

  const { data: recordings, isLoading: areRecordingsLoading, error: recordingsError } = useCollection<Recording>(recordingsQuery);
  
  const cantorIds = useMemo(() => {
    if (!recordings) return [];
    // Use a Set to ensure IDs are unique, then convert back to an array.
    return [...new Set(recordings.map(r => r.cantorId).filter(id => !!id))];
  }, [recordings]);

  const cantorsQuery = useMemoFirebase(() => {
    if (!firestore || cantorIds.length === 0 || !shouldFetchRelatedData) return null;
    // Firestore 'in' queries are limited to 30 items.
    return query(collection(firestore, 'cantors'), where('__name__', 'in', cantorIds.slice(0, 30)));
  }, [firestore, cantorIds, shouldFetchRelatedData]);
  
  const { data: cantors, isLoading: areCantorsLoading, error: cantorsError } = useCollection<Cantor>(cantorsQuery);

  const cantorsMap = useMemo(() => {
    if (!cantors) return new Map<string, Cantor>();
    return new Map(cantors.map(c => [c.id, c]));
  }, [cantors]);

  const hymnsWithRecordings = useMemo(() => {
    if (!hymns) return null;
    
    // For the debug page (no genreId), just return the hymns as is without recordings.
    if (!genreId && (!hymnIdsFilter || hymnIdsFilter.length === 0)) {
      return hymns;
    }

    if (!shouldFetchRelatedData) {
      return hymns.map(h => ({ ...h, recordings: [] }));
    }

    const isDataLoading = hymnIds.length > 0 && (areRecordingsLoading || areCantorsLoading);
    if (isDataLoading) {
      return null;
    }

    const recordingsByHymnId = new Map<string, Recording[]>();
    if (recordings) {
        // Group all active recordings by hymnId, now with cantor info
        recordings.forEach(rec => {
            const populatedRec = {
              ...rec,
              cantor: cantorsMap.get(rec.cantorId)
            };
            if (!recordingsByHymnId.has(rec.hymnId)) {
                recordingsByHymnId.set(rec.hymnId, []);
            }
            recordingsByHymnId.get(rec.hymnId)!.push(populatedRec);
        });
    }
    
    return hymns.map(hymn => {
        const hymnRecordings = recordingsByHymnId.get(hymn.id) || [];
        
        // Sort recordings within the hymn
        hymnRecordings.sort((a, b) => {
            if (a.mode === 'learn' && b.mode !== 'learn') return -1;
            if (a.mode !== 'learn' && b.mode === 'learn') return 1;
            const rankA = a.cantor?.rank ?? 99;
            const rankB = b.cantor?.rank ?? 99;
            return rankA - rankB;
        });

        return {
            ...hymn,
            recordings: hymnRecordings
        };
    }).filter(hymn => hymn.recordings.length > 0);

  }, [hymns, recordings, hymnIds, areRecordingsLoading, cantorsMap, areCantorsLoading, shouldFetchRelatedData, genreId, hymnIdsFilter]);

  const isLoading = areHymnsLoading || (shouldFetchRelatedData && (hymns != null && hymnsWithRecordings === null));

  return { 
    data: hymnsWithRecordings, 
    isLoading,
    error: hymnsError || recordingsError || cantorsError
  };
}
