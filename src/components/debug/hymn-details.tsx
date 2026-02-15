'use client';

import { Hymn, Genre } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ValidationMap } from './use-bulk-file-validation';
import { ValidationChip } from './validation-chip';


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
