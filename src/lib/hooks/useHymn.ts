
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
    // Get unique, non-empty cantor IDs
    return [...new Set(recordings.map(r => r.cantorId).filter(id => !!id))];
  }, [recordings]);

  const cantorsQuery = useMemoFirebase(() => {
    if (!firestore || cantorIds.length === 0) return null;
    // Firestore 'in' query has a limit of 30 items.
    return query(collection(firestore, 'cantors'), where('__name__', 'in', cantorIds.slice(0, 30)));
  }, [firestore, cantorIds]);
  
  const { data: cantors, isLoading: areCantorsLoading, error: cantorsError } = useCollection<Cantor>(cantorsQuery);

  const cantorsMap = useMemo(() => {
    if (!cantors) return new Map<string, Cantor>();
    return new Map(cantors.map(c => [c.id, c]));
  }, [cantors]);

  const hymnWithRecordings = useMemo(() => {
    // Wait until all data is loaded before attempting to merge
    if (!hymn || !recordings || (cantorIds.length > 0 && areCantorsLoading) || !cantors) {
      return null;
    }
    
    // Create a new hymn object to avoid direct state mutation
    const populatedHymn: Hymn = { ...hymn };

    // Populate recordings with cantor data
    populatedHymn.recordings = recordings.map(rec => {
      const cantor = cantorsMap.get(rec.cantorId);
      return {
        ...rec,
        cantor: cantor // Attach the full cantor object, or undefined if not found
      };
    });

    return populatedHymn;
  }, [hymn, recordings, cantors, cantorsMap, areCantorsLoading, cantorIds.length]);

  return { 
    data: hymnWithRecordings, 
    isLoading: isHymnLoading || areRecordingsLoading || (cantorIds.length > 0 && areCantorsLoading), 
    error: hymnError || recordingsError || cantorsError
  };
}
