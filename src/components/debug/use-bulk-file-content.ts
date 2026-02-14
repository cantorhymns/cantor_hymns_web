'use client';
import { useState, useEffect, useMemo } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';

export type ContentStatus = 'loading' | 'loaded' | 'error' | 'not_found';
export type ContentMap = Map<string, { status: ContentStatus, content: string | null }>;

export function useBulkFileContent(paths: (string | undefined)[]) {
    const [contentMap, setContentMap] = useState<ContentMap>(new Map());
    const [isBulkLoading, setIsBulkLoading] = useState(true);
    const { firebaseApp } = useFirebase();
    const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [firebaseApp]);

    const uniquePaths = useMemo(() => Array.from(new Set(paths.filter((p): p is string => !!p))), [paths]);

    useEffect(() => {
        if (!storage || uniquePaths.length === 0) {
            setIsBulkLoading(false);
            return;
        }

        setIsBulkLoading(true);
        const initialMap: ContentMap = new Map();
        uniquePaths.forEach(path => initialMap.set(path, { status: 'loading', content: null }));
        setContentMap(initialMap);

        const promises = uniquePaths.map(async (path) => {
            try {
                const storageRef = ref(storage, path);
                const url = await getDownloadURL(storageRef);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                const textContent = await response.text();
                return { path, status: 'loaded' as const, content: textContent.trim() };
            } catch (error: any) {
                 if (error.code === 'storage/object-not-found') {
                    return { path, status: 'not_found' as const, content: null };
                }
                console.error(`Error fetching file content ${path}:`, error);
                return { path, status: 'error' as const, content: null };
            }
        });

        Promise.all(promises).then(results => {
            const finalMap: ContentMap = new Map();
            results.forEach(({ path, status, content }) => {
                finalMap.set(path, { status, content });
            });
            setContentMap(finalMap);
            setIsBulkLoading(false);
        });

    }, [uniquePaths, storage]);

    return { contentMap, isContentLoading: isBulkLoading };
}
