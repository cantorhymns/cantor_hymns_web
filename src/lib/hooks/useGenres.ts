'use client';
import { useMemo } from 'react';
import { collection, query, DocumentData, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Genre } from '@/lib/types';
import { useFileContent } from './useFileContent';

const GENRES_ORDER_FILE_PATH = 'genres/genres_order.txt';

export function useGenres() {
  const firestore = useFirestore();
  const { content: orderFileContent, isLoading: isOrderLoading, error: orderFileError } = useFileContent(GENRES_ORDER_FILE_PATH);

  const genresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We fetch all genres and then filter/sort on the client.
    return query(collection(firestore, 'genres'));
  }, [firestore]);

  // Fetch all genres without server-side filtering/sorting
  const { data: allGenres, isLoading: areGenresLoading, error: genresError } = useCollection<Genre>(genresQuery);

  // Perform filtering and sorting on the client-side
  const processedGenres = useMemo(() => {
    if (!allGenres) return null;

    const activeGenres = allGenres.filter(genre => genre.active === true);
    
    if (!orderFileContent) {
        // Fallback to sorting by name if the file doesn't exist or is empty
        return activeGenres.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const orderedIds = orderFileContent.split('\n').map(id => id.trim()).filter(Boolean);
    const orderedIdSet = new Set(orderedIds);
    
    const orderedFromFile: Genre[] = [];
    const notInFile: Genre[] = [];

    activeGenres.forEach(genre => {
        if (orderedIdSet.has(genre.id)) {
            orderedFromFile.push(genre);
        } else {
            notInFile.push(genre);
        }
    });

    // Order the ones from the file according to the file
    orderedFromFile.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));

    // Sort the rest alphabetically
    notInFile.sort((a, b) => a.name.localeCompare(b.name));

    return [...orderedFromFile, ...notInFile];
    
  }, [allGenres, orderFileContent]);

  const isLoading = areGenresLoading || isOrderLoading;
  const error = genresError || orderFileError;

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
