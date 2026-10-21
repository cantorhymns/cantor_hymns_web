'use client';
import { useMemo } from 'react';
import { Cantor } from '@/lib/types';
import { useFileContent } from './useFileContent';
import { getCantors, useCatalog } from '@/lib/services/catalog';

const CANTORS_ORDER_FILE_PATH = 'tracks/cantors_order.txt';

export function useCantors() {
  const catalog = useCatalog();
  const { content: orderFileContent, isLoading: isOrderLoading, error: orderFileError } = useFileContent(CANTORS_ORDER_FILE_PATH);

  const allCantors = useMemo(() => getCantors(), [catalog]);

  const processedCantors = useMemo(() => {
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

    orderedFromFile.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
    notInFile.sort((a, b) => a.name.localeCompare(b.name));

    return [...orderedFromFile, ...notInFile];
  }, [allCantors, orderFileContent]);

  return { data: processedCantors, isLoading: isOrderLoading, error: orderFileError };
}
