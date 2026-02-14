'use client';
import { useState, useEffect, useMemo } from 'react';
import { getStorage, ref, getMetadata } from 'firebase/storage';
import { useFirebase } from '@/firebase';

export type ValidationStatus = 'valid' | 'invalid' | 'loading' | 'unchecked';
export type ValidationMap = Map<string, ValidationStatus>;

export function useBulkFileValidation(paths: (string | undefined)[]) {
    const [validationMap, setValidationMap] = useState<ValidationMap>(new Map());
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
        const initialMap: ValidationMap = new Map();
        uniquePaths.forEach(path => initialMap.set(path, 'loading'));
        setValidationMap(initialMap);

        const promises = uniquePaths.map(async (path) => {
            try {
                const storageRef = ref(storage, path);
                await getMetadata(storageRef);
                return { path, status: 'valid' as ValidationStatus };
            } catch (error: any) {
                if (error.code === 'storage/object-not-found') {
                    return { path, status: 'invalid' as ValidationStatus };
                }
                console.error(`Error checking file ${path}:`, error);
                return { path, status: 'invalid' as ValidationStatus };
            }
        });

        Promise.all(promises).then(results => {
            const finalMap: ValidationMap = new Map();
            results.forEach(({ path, status }) => {
                finalMap.set(path, status);
            });
            setValidationMap(finalMap);
            setIsBulkLoading(false);
        });

    }, [uniquePaths, storage]);

    return { validationMap, isBulkLoading };
}
