
'use client';
import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Cantor } from '@/lib/types';

export function useCantors() {
  const firestore = useFirestore();

  const cantorsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'cantors'), orderBy('rank', 'asc'));
  }, [firestore]);

  const { data: cantors, ...rest } = useCollection<Cantor>(cantorsQuery);
  
  return { data: cantors, ...rest };
}
