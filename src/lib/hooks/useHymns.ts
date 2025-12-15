
'use client';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Hymn, Recording } from '@/lib/types';

export function useHymns(genreId?: string) {
  const firestore = useFirestore();

  const hymnsQuery = useMemoFirebase(() => {
    if (!firestore || !genreId) return null;
    return query(collection(firestore, 'hymns'), where('genreId', '==', genreId));
  }, [firestore, genreId]);

  const { data: hymns, isLoading: areHymnsLoading, error: hymnsError } = useCollection<Hymn>(hymnsQuery);

  const hymnIds = useMemo(() => hymns?.map(h => h.id) || [], [hymns]);

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || hymnIds.length === 0) return null;
    // Firestore 'in' query is limited to 30 items. If you expect more, you'll need to batch queries.
    return query(collection(firestore, 'recordings'), where('hymnId', 'in', hymnIds.slice(0,30)));
  }, [firestore, hymnIds]);

  const { data: recordings, isLoading: areRecordingsLoading, error: recordingsError } = useCollection<Recording>(recordingsQuery);

  const hymnsWithRecordings = useMemo(() => {
    if (!hymns) return null;
    if (hymnIds.length > 0 && areRecordingsLoading) return null; // Wait for recordings to load

    const recordingsByHymnId = new Map<string, Recording[]>();
    if (recordings) {
        recordings.forEach(rec => {
            if (!recordingsByHymnId.has(rec.hymnId)) {
                recordingsByHymnId.set(rec.hymnId, []);
            }
            recordingsByHymnId.get(rec.hymnId)!.push(rec);
        });
    }

    return hymns.map(hymn => ({
        ...hymn,
        recordings: recordingsByHymnId.get(hymn.id) || []
    }));

  }, [hymns, recordings, hymnIds, areRecordingsLoading]);


  return { 
    data: hymnsWithRecordings, 
    isLoading: areHymnsLoading || (hymns && !hymnsWithRecordings),
    error: hymnsError || recordingsError
  };
}
