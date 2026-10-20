'use client';
import { useMemo } from 'react';
import { Recording } from '@/lib/types';
import { getAllRecordings } from '@/lib/services/catalog';

export function useRecordings() {
  const recordings = useMemo(() => getAllRecordings(), []);
  return { data: recordings, isLoading: false, error: null };
}
