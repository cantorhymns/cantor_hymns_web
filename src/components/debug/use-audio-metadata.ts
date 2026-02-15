'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';

export function useAudioMetadata(path?: string) {
    const [duration, setDuration] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { firebaseApp } = useFirebase();
    const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [firebaseApp]);

    useEffect(() => {
        if (!path || !storage) {
            setDuration(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        let isCancelled = false;
        const audio = new Audio();

        const fetchAndLoad = async () => {
            setIsLoading(true);
            setError(null);
            setDuration(null);
            try {
                const storageRef = ref(storage, path);
                const url = await getDownloadURL(storageRef);

                if (isCancelled) return;

                audio.preload = 'metadata';
                audio.src = url;

                audio.onloadedmetadata = () => {
                    if (!isCancelled && isFinite(audio.duration)) {
                        setDuration(audio.duration);
                        setIsLoading(false);
                    }
                };

                audio.onerror = () => {
                    if (!isCancelled) {
                        setError('Failed to load audio metadata. The file might be corrupt or inaccessible.');
                        setIsLoading(false);
                    }
                };

            } catch (e: any) {
                if (!isCancelled) {
                    setError(e.message || 'Failed to get audio download URL.');
                    setIsLoading(false);
                }
            }
        };

        fetchAndLoad();

        return () => {
            isCancelled = true;
            audio.src = ''; // Stop loading
            audio.onloadedmetadata = null;
            audio.onerror = null;
        };
    }, [path, storage]);

    return { duration, isLoading, error };
}
