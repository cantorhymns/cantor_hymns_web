
'use client';
import { useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Hymn, Recording, Cantor } from '@/lib/types';

export function useHymn(hymnId?: string) {
  const firestore = useFirestore();

  const hymnRef = useMemoFirebase(() => {
    if (!firestore || !hymnId) return null;
    return doc(firestore, 'hymns', hymnId);
  }, [firestore, hymnId]);

  const { data: hymn, isLoading: isHymnLoading, error: hymnError } = useDoc<Hymn>(hymnRef);

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || !hymnId) return null;
    return query(collection(firestore, 'recordings'), where('hymnId', '==', hymnId));
  }, [firestore, hymnId]);

  const { data: recordings, isLoading: areRecordingsLoading, error: recordingsError } = useCollection<Recording>(recordingsQuery);

  const cantorIds = useMemo(() => {
    if (!recordings) return [];
    return [...new Set(recordings.map(r => r.cantorId).filter(id => !!id))];
  }, [recordings]);

  const cantorsQuery = useMemoFirebase(() => {
    if (!firestore || cantorIds.length === 0) return null;
    return query(collection(firestore, 'cantors'), where('__name__', 'in', cantorIds.slice(0, 30)));
  }, [firestore, cantorIds]);
  
  const { data: cantors, isLoading: areCantorsLoading, error: cantorsError } = useCollection<Cantor>(cantorsQuery);

  const cantorsMap = useMemo(() => {
    if (!cantors) return new Map<string, Cantor>();
    return new Map(cantors.map(c => [c.id, c]));
  }, [cantors]);
  
  const isLoading = isHymnLoading || areRecordingsLoading || (cantorIds.length > 0 && areCantorsLoading);

  const hymnWithRecordings = useMemo(() => {
    if (isLoading || !hymn) return null;
    
    const populatedHymn: Hymn = { ...hymn, recordings: [] };

    if (recordings) {
        populatedHymn.recordings = recordings.map(rec => ({
            ...rec,
            cantor: cantorsMap.get(rec.cantorId)
        }));
    }

    return populatedHymn;
  }, [hymn, recordings, cantorsMap, isLoading]);
  
  return { 
    data: hymnWithRecordings, 
    isLoading: isLoading,
    error: hymnError || recordingsError || cantorsError
  };
}
