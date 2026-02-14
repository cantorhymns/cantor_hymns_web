
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';

export function useFileContent(path?: string) {
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { firebaseApp } = useFirebase();
    const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [firebaseApp]);

    useEffect(() => {
        if (!path || !storage) {
            setContent(null);
            setIsLoading(false);
            setError(path ? 'Path provided but storage not available' : null);
            return;
        }

        let isCancelled = false;
        const fetchContent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const storageRef = ref(storage, path);
                const url = await getDownloadURL(storageRef);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                const textContent = await response.text();
                if (!isCancelled) {
                    setContent(textContent.trim());
                }
            } catch (e: any) {
                if (!isCancelled) {
                    setError(e.message || 'Failed to fetch content');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchContent();

        return () => {
            isCancelled = true;
        };
    }, [path, storage]);

    return { content, isLoading, error };
}
