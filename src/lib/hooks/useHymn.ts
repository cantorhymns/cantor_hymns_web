
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
    // Use a Set to ensure IDs are unique, then convert back to an array.
    return [...new Set(recordings.map(r => r.cantorId).filter(id => !!id))];
  }, [recordings]);

  const cantorsQuery = useMemoFirebase(() => {
    if (!firestore || cantorIds.length === 0) return null;
    // Firestore 'in' queries are limited to 30 items.
    return query(collection(firestore, 'cantors'), where('__name__', 'in', cantorIds.slice(0, 30)));
  }, [firestore, cantorIds]);
  
  const { data: cantors, isLoading: areCantorsLoading, error: cantorsError } = useCollection<Cantor>(cantorsQuery);

  const cantorsMap = useMemo(() => {
    if (!cantors) return new Map<string, Cantor>();
    return new Map(cantors.map(c => [c.id, c]));
  }, [cantors]);
  
  // The main loading state is true if we are fetching the hymn, or the recordings,
  // or if we have recordings but are still waiting for the cantors.
  const isLoading = isHymnLoading || areRecordingsLoading || (recordings && cantorIds.length > 0 && areCantorsLoading);

  const hymnWithRecordings = useMemo(() => {
    // Don't try to assemble the data until everything is loaded.
    if (!hymn || !recordings || (cantorIds.length > 0 && !cantors)) {
      return null;
    }
    
    // Create a new hymn object to avoid direct mutation.
    const populatedHymn: Hymn = { ...hymn };

    // Map over recordings and embed the full cantor object.
    populatedHymn.recordings = recordings.map(rec => ({
        ...rec,
        cantor: cantorsMap.get(rec.cantorId)
    })).sort((a, b) => a.cantor?.name.localeCompare(b.cantor?.name || '') || 0); // Sort by cantor name

    return populatedHymn;
  }, [hymn, recordings, cantors, cantorsMap, cantorIds.length]);
  
  return { 
    data: hymnWithRecordings, 
    isLoading: isLoading,
    error: hymnError || recordingsError || cantorsError
  };
}
