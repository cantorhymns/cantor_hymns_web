'use client';

import { Hymn, Genre } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FileCheck, FileX, Loader2 } from 'lucide-react';
import { ValidationMap } from './use-bulk-file-validation';

const ValidationChip = ({ path, validationMap, isLoading }: { path?: string; validationMap: ValidationMap, isLoading: boolean }) => {
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


export const HymnDetails = ({ hymn, genresMap, validationMap, isLoading }: { hymn: Hymn, genresMap: Map<string, Genre>, validationMap: ValidationMap, isLoading: boolean }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{hymn.name}</CardTitle>
                <CardDescription>ID: {hymn.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p><strong>Description:</strong> {hymn.description || 'N/A'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <strong>Genres:</strong>
                        <ul className="list-disc list-inside">
                            {hymn.genreId.map(gid => {
                                const genre = genresMap.get(gid);
                                return <li key={gid}>{genre?.name || gid}</li>;
                            })}
                        </ul>
                    </div>
                    <div>
                        <strong>Sub-Genres / Ranks:</strong>
                        <ul className="list-disc list-inside">
                            {Object.entries(hymn.subGenreId || {}).map(([gid, sub]) => (
                                <li key={gid}>{genresMap.get(gid)?.name || gid}: {sub} (Rank: {hymn.genreRank?.[gid] || 'N/A'})</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div>
                    <strong>Lyrics:</strong>
                    <div className="space-y-1 mt-1">
                        <ValidationChip path={hymn.lyricsEnglish} validationMap={validationMap} isLoading={isLoading} />
                        <ValidationChip path={hymn.lyricsCoptic} validationMap={validationMap} isLoading={isLoading} />
                        <ValidationChip path={hymn.lyricsArabic} validationMap={validationMap} isLoading={isLoading} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
