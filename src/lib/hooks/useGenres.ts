
'use client';
import { useMemo } from 'react';
import { collection, query, DocumentData, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Genre } from '@/lib/types';

export function useGenres() {
  const firestore = useFirestore();

  const genresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'genres'));
  }, [firestore]);

  const { data: genres, ...rest } = useCollection<Genre>(genresQuery);
  return { data: genres, ...rest };
}

export function useGenre(params?: { genreId?: string, genre?: string }) {
    const firestore = useFirestore();
    const genreId = params?.genreId || params?.genre;

    const genreRef = useMemoFirebase(() => {
        if (!firestore || !genreId) return null;
        return doc(firestore, 'genres', genreId);
    }, [firestore, genreId]);

    const {data: genre, ...rest} = useDoc<Genre>(genreRef);
    return { data: genre, ...rest };
}
