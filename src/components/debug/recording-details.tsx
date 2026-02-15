'use client';
import { Recording } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ValidationMap } from './use-bulk-file-validation';
import { ValidationChip } from './validation-chip';
import { useFileContent } from '@/lib/hooks/useFileContent';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { useAudioMetadata } from './use-audio-metadata';


export const RecordingDetails = ({ recording, validationMap, isLoading: isValidationLoading }: { recording: Recording, validationMap: ValidationMap, isLoading: boolean }) => {
    const { content: markersContent, isLoading: isMarkersContentLoading, error: markersError } = useFileContent(recording.mode === 'learn' ? recording.markersUrl : undefined);
    const { duration: browserDuration, isLoading: isBrowserDurationLoading, error: browserDurationError } = useAudioMetadata(recording.audioUrl);
    
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
                        <p><strong>DB Audio Length:</strong> {recording.audioLength ? `${recording.audioLength.toFixed(4)}s` : <span className="text-amber-600">Not Set</span>}</p>
                        <p>
                            <strong>Browser Audio Length:</strong>
                            {isBrowserDurationLoading ? <span className="text-muted-foreground"> Loading...</span> :
                            browserDurationError ? <span className="text-destructive"> Error</span> :
                            browserDuration !== null ? ` ${browserDuration.toFixed(4)}s` : ' N/A'}
                            {browserDuration && recording.audioLength && Math.abs(browserDuration - recording.audioLength) > 0.1 &&
                                <span className="text-amber-600 ml-2 font-bold">
                                    (Mismatch! Delta: {Math.abs(browserDuration - recording.audioLength).toFixed(4)}s)
                                </span>
                            }
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p><strong>Audio File:</strong></p>
                        <ValidationChip path={recording.audioUrl} validationMap={validationMap} isLoading={isValidationLoading} />
                        {recording.mode === 'learn' && (
                            <>
                                <p className="pt-2"><strong>Markers File:</strong></p>
                                <ValidationChip path={recording.markersUrl} validationMap={validationMap} isLoading={isValidationLoading} />
                            </>
                        )}
                    </div>
                </div>
                 {recording.mode === 'learn' && (
                     <div className='pt-2'>
                        <strong>Markers File Content:</strong>
                        {isMarkersContentLoading ? (
                            <Skeleton className="h-24 w-full mt-1" />
                        ) : markersError ? (
                            <div className="mt-1 rounded-md border border-destructive/50 text-destructive p-4">
                                <p className="font-bold">Error loading markers file</p>
                                <p className="text-xs">{markersError}</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-48 w-full rounded-md border bg-secondary/20 mt-1">
                                <pre className="p-4 text-xs whitespace-pre-wrap font-mono">
                                    {markersContent || 'File is empty.'}
                                </pre>
                            </ScrollArea>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
