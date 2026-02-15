'use client';

import { Genre } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ValidationChip } from './validation-chip';
import { ValidationMap } from './use-bulk-file-validation';

export const GenreDetails = ({ genre, validationMap, isLoading }: { genre: Genre, validationMap: ValidationMap, isLoading: boolean }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{genre.name}</CardTitle>
                <CardDescription>ID: {genre.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <p><strong>Description:</strong> {genre.description || 'N/A'}</p>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <strong>File Paths:</strong>
                        <div className="space-y-1 mt-1">
                            <ValidationChip path={genre.backgroundUrl} validationMap={validationMap} isLoading={isLoading} />
                            <ValidationChip path={genre.contentUrl} validationMap={validationMap} isLoading={isLoading} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
