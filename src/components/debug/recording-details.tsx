'use client';
import { Recording } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ValidationMap } from './use-bulk-file-validation';
import { ValidationChip } from './validation-chip';


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
