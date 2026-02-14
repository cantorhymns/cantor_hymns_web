
'use client';
import { useState, useEffect, useMemo } from 'react';
import { getStorage, ref, getMetadata } from 'firebase/storage';
import { useFirebase } from '@/firebase';

export function useFileValidation(path?: string) {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { firebaseApp } = useFirebase();
    const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [firebaseApp]);

    useEffect(() => {
        if (!path || !storage) {
            setIsValid(false);
            return;
        }

        let isCancelled = false;
        const checkFile = async () => {
            setIsLoading(true);
            try {
                const storageRef = ref(storage, path);
                await getMetadata(storageRef);
                if (!isCancelled) setIsValid(true);
            } catch (error: any) {
                if (!isCancelled) {
                    if (error.code === 'storage/object-not-found') {
                        setIsValid(false);
                    } else {
                        // Could be permissions error, etc.
                        console.error(`Error checking file ${path}:`, error);
                        setIsValid(false);
                    }
                }
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        checkFile();

        return () => {
            isCancelled = true;
        };
    }, [path, storage]);

    return { isValid, isLoading };
}
