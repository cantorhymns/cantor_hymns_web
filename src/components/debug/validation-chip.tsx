'use client';

import { FileCheck, FileX, Loader2 } from 'lucide-react';
import { ValidationMap } from './use-bulk-file-validation';

export const ValidationChip = ({ path, validationMap, isLoading }: { path?: string; validationMap: ValidationMap, isLoading: boolean }) => {
    if (!path) return null;

    const status = validationMap.get(path);

    if (isLoading || status === 'loading') {
        return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin"/>Checking...</span>;
    }
    
    const isValid = status === 'valid';

    return (
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isValid ? <FileCheck className="h-3 w-3" /> : <FileX className="h-3 w-3" />}
            <span>{path}</span>
        </div>
    );
}
