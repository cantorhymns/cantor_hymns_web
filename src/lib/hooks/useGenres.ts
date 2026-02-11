
'use client';
import { useMemo } from 'react';
import { collection, query, DocumentData, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Genre } from '@/lib/types';

export function useGenres() {
  const firestore = useFirestore();

  const genresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We fetch all genres and then filter/sort on the client.
    // This avoids the need for a composite index in Firestore, which can cause permission errors if not created.
    return query(collection(firestore, 'genres'));
  }, [firestore]);

  // Fetch all genres without server-side filtering/sorting
  const { data: allGenres, isLoading, error } = useCollection<Genre>(genresQuery);

  // Perform filtering and sorting on the client-side
  const processedGenres = useMemo(() => {
    if (!allGenres) return null;

    return allGenres
      .filter(genre => genre.active === true)
      .sort((a, b) => a.rank - b.rank);
  }, [allGenres]);

  // Return the processed data along with the original loading and error state
  return { data: processedGenres, isLoading, error };
}

export function useGenre(genreId?: string) {
    const firestore = useFirestore();

    const genreRef = useMemoFirebase(() => {
        if (!firestore || !genreId) return null;
        return doc(firestore, 'genres', genreId);
    }, [firestore, genreId]);

    const {data: genre, isLoading, error} = useDoc<Genre>(genreRef);
    
    return { data: genre, isLoading, error };
}
