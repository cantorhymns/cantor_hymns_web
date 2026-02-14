'use client';
import { Recording } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FileCheck, FileX, AlertTriangle, CheckCircle2, Loader2, Copy } from 'lucide-react';
import { ValidationMap } from './use-bulk-file-validation';
import { ContentMap } from './use-bulk-file-content';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

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

const MarkersComparison = ({ recording, contentMap, isContentLoading }: { recording: Recording, contentMap: ContentMap, isContentLoading: boolean }) => {
    const { toast } = useToast();
    const markerContentData = recording.markersUrl ? contentMap.get(recording.markersUrl) : undefined;
    
    const isLoading = isContentLoading || markerContentData?.status === 'loading';
    const error = markerContentData?.status === 'error' ? 'Error loading markers file' : null;
    const markersFileContent = markerContentData?.content;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: `${label} copied to clipboard.`});
        }).catch(err => {
            toast({ title: `Failed to copy ${label}`, variant: 'destructive'});
            console.error('Failed to copy text: ', err);
        });
    };

    if (isLoading) {
        return <p className="text-xs text-muted-foreground">Loading markers file...</p>;
    }
    if (error) {
        return <p className="text-xs text-red-600">{error}</p>;
    }
    if (markerContentData?.status === 'not_found' || !markersFileContent) {
        return <p className="text-xs text-amber-600">Markers file content not available.</p>;
    }

    const marksFromDb = recording.marks || [];
    const marksFromFile = markersFileContent.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

    const sortedDb = [...marksFromDb].sort((a, b) => a - b);
    const sortedFile = [...marksFromFile].sort((a, b) => a - b);
    const areEqual = sortedDb.length === sortedFile.length && sortedDb.every((val, index) => val === sortedFile[index]);

    const dbContent = sortedDb.join('\n');
    const fileContent = sortedFile.join('\n');

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">Markers Comparison</h4>
                {areEqual ? (
                    <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Match</span>
                ) : (
                    <span className="flex items-center gap-1.5 text-base font-bold text-amber-600"><AlertTriangle className="h-4 w-4" /> Mismatch</span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono p-2 border rounded-md bg-secondary/30">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h5 className="font-semibold">DB `marks` ({sortedDb.length})</h5>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(dbContent, 'DB marks')}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <pre className="max-h-48 overflow-auto">{dbContent}</pre>
                </div>
                <div>
                     <div className="flex justify-between items-center mb-1">
                        <h5 className="font-semibold">File Content ({sortedFile.length})</h5>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(fileContent, 'File marks')}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <pre className="max-h-48 overflow-auto">{fileContent}</pre>
                </div>
            </div>
        </div>
    );
}

export const RecordingDetails = ({ recording, validationMap, isLoading, contentMap, isContentLoading }: { recording: Recording, validationMap: ValidationMap, isLoading: boolean, contentMap: ContentMap, isContentLoading: boolean }) => {
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
                {recording.mode === 'learn' && recording.markersUrl && <MarkersComparison recording={recording} contentMap={contentMap} isContentLoading={isContentLoading} />}
            </CardContent>
        </Card>
    );
};
