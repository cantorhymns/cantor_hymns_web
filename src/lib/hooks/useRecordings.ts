'use client';
import { useMemo } from 'react';
import { Recording } from '@/lib/types';
import { getAllRecordings, useCatalog } from '@/lib/services/catalog';

export function useRecordings() {
  const catalog = useCatalog();
  const recordings = useMemo(() => getAllRecordings(), [catalog]);
  return { data: recordings, isLoading: false, error: null };
}
