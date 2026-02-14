
'use client';
import { Recording } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FileCheck, FileX, Loader2 } from 'lucide-react';
import { ValidationMap } from './use-bulk-file-validation';

const ValidationChip = ({ path, validationMap, isLoading }: { path?: string; validationMap: ValidationMap; isLoading: boolean }) => {
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
};


export const RecordingDetails = ({ recording, validationMap, isLoading }: { recording: Recording, validationMap: ValidationMap, isLoading: boolean }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recording ID: {recording.id}</CardTitle>
                <CardDescription>Hymn ID: {recording.hymnId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p><strong>Cantor:</strong> {recording.cantor?.name || 'N/A'}</p>
                        <p><strong>Mode:</strong> {recording.mode}</p>
                        <p><strong>Active:</strong> {String(recording.active)}</p>
                    </div>
                    <div className="space-y-1">
                        <p><strong>Audio File:</strong></p>
                        <ValidationChip path={recording.audioUrl} validationMap={validationMap} isLoading={isLoading} />
                        {recording.mode === 'learn' && (
                            <>
                                <p className="pt-2"><strong>Markers File:</strong></p>
                                <ValidationChip path={recording.markersUrl} validationMap={validationMap} isLoading={isLoading} />
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
