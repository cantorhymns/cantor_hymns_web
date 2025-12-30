
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
    // Fetch all recordings, not just active ones. The player will handle the logic.
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
  
  // The main loading state is true until the hymn, its recordings, and the cantors for those recordings are all loaded.
  const isLoading = isHymnLoading || areRecordingsLoading || (recordings && cantorIds.length > 0 && areCantorsLoading);

  const hymnWithRecordings = useMemo(() => {
    // Don't try to assemble the data until everything is loaded.
    if (!hymn) {
      return null;
    }
    
    // If we have a hymn but are still waiting on related data, return the basic hymn object.
    // This allows the page title to render while recordings are still loading.
    if (isLoading) {
      return { ...hymn, recordings: [] };
    }
    
    // Create a new hymn object to avoid direct mutation.
    const populatedHymn: Hymn = { ...hymn };

    if (recordings) {
        // Map over recordings and embed the full cantor object.
        const populatedRecordings = recordings.map(rec => ({
            ...rec,
            cantor: cantorsMap.get(rec.cantorId)
        }));

        // Sort according to the new logic: active first, then rank.
        populatedRecordings.sort((a, b) => {
            if (a.active && !b.active) return -1; // a is active, b is not -> a comes first
            if (!a.active && b.active) return 1;  // b is active, a is not -> b comes first
            
            // If both have the same active status, sort by rank.
            const rankA = a.cantor?.rank ?? 99;
            const rankB = b.cantor?.rank ?? 99;
            return rankA - rankB;
        });

        populatedHymn.recordings = populatedRecordings;
    } else {
        populatedHymn.recordings = [];
    }


    return populatedHymn;
  }, [hymn, recordings, cantorsMap, isLoading]);
  
  return { 
    data: hymnWithRecordings, 
    isLoading: !hymnWithRecordings, // Loading is true if the final object hasn't been assembled
    error: hymnError || recordingsError || cantorsError
  };
}
