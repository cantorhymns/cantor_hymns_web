
'use client';
import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Recording } from '@/lib/types';

export function useRecordings() {
  const firestore = useFirestore();

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'recordings'), where('active', '==', true));
  }, [firestore]);

  const { data: recordings, ...rest } = useCollection<Recording>(recordingsQuery);
  
  return { data: recordings, ...rest };
}
