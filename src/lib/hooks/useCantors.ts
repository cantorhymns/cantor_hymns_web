
'use client';
import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Cantor } from '@/lib/types';
import { useFileContent } from './useFileContent';

const CANTORS_ORDER_FILE_PATH = 'tracks/cantors_order.txt';

export function useCantors() {
  const firestore = useFirestore();
  const { content: orderFileContent, isLoading: isOrderLoading, error: orderFileError } = useFileContent(CANTORS_ORDER_FILE_PATH);

  const cantorsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'cantors'));
  }, [firestore]);

  const { data: allCantors, isLoading: areCantorsLoading, error: cantorsError } = useCollection<Cantor>(cantorsQuery);

  const processedCantors = useMemo(() => {
    if (!allCantors) return null;

    if (!orderFileContent) {
        return [...allCantors].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const orderedIds = orderFileContent.split('\n').map(id => id.trim()).filter(Boolean);
    const orderedIdSet = new Set(orderedIds);
    
    const orderedFromFile: Cantor[] = [];
    const notInFile: Cantor[] = [];

    allCantors.forEach(cantor => {
        if (orderedIdSet.has(cantor.id)) {
            orderedFromFile.push(cantor);
        } else {
            notInFile.push(cantor);
        }
    });

    // Order the ones from the file according to the file
    orderedFromFile.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));

    // Sort the rest alphabetically
    notInFile.sort((a, b) => a.name.localeCompare(b.name));
    
    return [...orderedFromFile, ...notInFile];

  }, [allCantors, orderFileContent]);

  const isLoading = areCantorsLoading || isOrderLoading;
  const error = cantorsError || orderFileError;

  return { data: processedCantors, isLoading, error };
}
