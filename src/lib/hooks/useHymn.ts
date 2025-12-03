
'use client';
import { useMemo } from 'react';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Hymn, Recording, Cantor } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

async function fetchCantors(firestore: any, cantorIds: string[]): Promise<Map<string, Cantor>> {
    if (cantorIds.length === 0) {
      return new Map();
    }
    const cantorsRef = collection(firestore, 'cantors');
    const q = query(cantorsRef, where('__name__', 'in', cantorIds));
    const snapshot = await getDocs(q);
    const cantorsMap = new Map<string, Cantor>();
    snapshot.forEach(doc => {
      cantorsMap.set(doc.id, { id: doc.id, ...doc.data() } as Cantor);
    });
    return cantorsMap;
}

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
    return [...new Set(recordings.map(r => r.cantorId))];
  }, [recordings]);

  const { data: cantorsMap, isLoading: areCantorsLoading, error: cantorsError } = useQuery({
      queryKey: ['cantors', cantorIds],
      queryFn: () => fetchCantors(firestore, cantorIds),
      enabled: !!firestore && cantorIds.length > 0
  });

  const hymnWithRecordings = useMemo(() => {
    if (!hymn || !recordings || (cantorIds.length > 0 && !cantorsMap)) return null;
    
    const populatedRecordings = recordings.map(rec => ({
        ...rec,
        cantor: cantorsMap?.get(rec.cantorId)
    }));

    return {
      ...hymn,
      recordings: populatedRecordings,
    };
  }, [hymn, recordings, cantorsMap, cantorIds]);

  return { 
    data: hymnWithRecordings, 
    isLoading: isHymnLoading || areRecordingsLoading || areCantorsLoading, 
    error: hymnError || recordingsError || cantorsError
  };
}
