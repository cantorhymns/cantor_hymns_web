
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

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || !hymns || hymns.length === 0) return null;
    const hymnIds = hymns.map(h => h.id);
    // Firestore 'in' query is limited to 30 items. If you expect more, you'll need to batch queries.
    return query(collection(firestore, 'recordings'), where('hymnId', 'in', hymnIds.slice(0,30)));
  }, [firestore, hymns]);

  const { data: recordings, isLoading: areRecordingsLoading, error: recordingsError } = useCollection<Recording>(recordingsQuery);

  const hymnsWithRecordings = useMemo(() => {
    if (!hymns) return null; 
    if (!recordings) { 
        return hymns.map(hymn => ({
            ...hymn,
            recordings: []
        }));
    }
    
    const recordingsByHymnId = new Map<string, Recording[]>();
    recordings.forEach(rec => {
        if (!recordingsByHymnId.has(rec.hymnId)) {
            recordingsByHymnId.set(rec.hymnId, []);
        }
        recordingsByHymnId.get(rec.hymnId)!.push(rec);
    });

    return hymns.map(hymn => ({
        ...hymn,
        recordings: recordingsByHymnId.get(hymn.id) || []
    }));

  }, [hymns, recordings]);


  return { 
    data: hymnsWithRecordings, 
    isLoading: areHymnsLoading || areRecordingsLoading,
    error: hymnsError || recordingsError
  };
}
