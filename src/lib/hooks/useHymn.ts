
'use client';
import { useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Hymn, Recording, Cantor } from '@/lib/types';
import { useFileContent } from './useFileContent';

const CANTORS_ORDER_FILE_PATH = 'tracks/cantors_order.txt';

export function useHymn(hymnId?: string) {
  const firestore = useFirestore();
  const { content: cantorsOrderFile, isLoading: isCantorsOrderLoading, error: cantorsOrderError } = useFileContent(CANTORS_ORDER_FILE_PATH);

  const hymnRef = useMemoFirebase(() => {
    if (!firestore || !hymnId) return null;
    return doc(firestore, 'hymns', hymnId);
  }, [firestore, hymnId]);

  const { data: hymn, isLoading: isHymnLoading, error: hymnError } = useDoc<Hymn>(hymnRef);

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || !hymnId) return null;
    // Fetch only active recordings for this hymn.
    return query(collection(firestore, 'recordings'), where('hymnId', '==', hymnId), where('active', '==', true));
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
  
  const cantorsOrder = useMemo(() => {
    if (!cantorsOrderFile) return [];
    return cantorsOrderFile.split('\n').map(id => id.trim()).filter(Boolean);
  }, [cantorsOrderFile]);

  // The main loading state is true until the hymn, its recordings, and the cantors for those recordings are all loaded.
  const isLoading = isHymnLoading || areRecordingsLoading || (recordings && cantorIds.length > 0 && areCantorsLoading) || isCantorsOrderLoading;

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

        // Sort by mode ('learn' first), then by cantor order.
        populatedRecordings.sort((a, b) => {
            // "learn" mode comes before "listen" mode
            if (a.mode === 'learn' && b.mode !== 'learn') return -1;
            if (a.mode !== 'learn' && b.mode === 'learn') return 1;
            
            // If modes are the same, sort by cantor order from file, then name.
            const aId = a.cantorId;
            const bId = b.cantorId;
            const indexA = cantorsOrder.indexOf(aId);
            const indexB = cantorsOrder.indexOf(bId);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB; // Both are in the order file
            }
            if (indexA !== -1) return -1; // A is in, B is not
            if (indexB !== -1) return 1;  // B is in, A is not

            // Neither is in the order file, sort by name
            return (a.cantor?.name || '').localeCompare(b.cantor?.name || '');
        });

        populatedHymn.recordings = populatedRecordings;
    } else {
        populatedHymn.recordings = [];
    }


    return populatedHymn;
  }, [hymn, recordings, cantorsMap, isLoading, cantorsOrder]);
  
  return { 
    data: hymnWithRecordings, 
    isLoading: !hymnWithRecordings, // Loading is true if the final object hasn't been assembled
    error: hymnError || recordingsError || cantorsError || cantorsOrderError
  };
}
