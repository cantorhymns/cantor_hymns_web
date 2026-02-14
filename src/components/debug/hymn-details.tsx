
'use client';

import { Hymn, Genre } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FileCheck, FileX } from 'lucide-react';
import { useFileValidation } from './use-file-validation';

const ValidationChip = ({ path }: { path?: string }) => {
    const { isValid, isLoading } = useFileValidation(path);

    if (!path) return null;

    if (isLoading) {
        return <span className="text-xs text-muted-foreground">Checking...</span>;
    }

    return (
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isValid ? <FileCheck className="h-3 w-3" /> : <FileX className="h-3 w-3" />}
            <span>{path}</span>
        </div>
    );
}


export const HymnDetails = ({ hymn, genresMap }: { hymn: Hymn, genresMap: Map<string, Genre> }) => {
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
                        <ValidationChip path={hymn.lyricsEnglish} />
                        <ValidationChip path={hymn.lyricsCoptic} />
                        <ValidationChip path={hymn.lyricsArabic} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
