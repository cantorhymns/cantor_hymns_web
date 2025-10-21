
'use client';
import { useMemo } from 'react';
import { doc, collection, query, where } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Hymn, Recording } from '@/lib/types';

export function useHymn(params?: { hymnId?: string }) {
  const firestore = useFirestore();
  const hymnId = params?.hymnId;

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

  const hymnWithRecordings = useMemo(() => {
    if (!hymn) return null;
    return {
      ...hymn,
      recordings: recordings || [],
    };
  }, [hymn, recordings]);

  return { 
    data: hymnWithRecordings, 
    isLoading: isHymnLoading || areRecordingsLoading, 
    error: hymnError || recordingsError 
  };
}
