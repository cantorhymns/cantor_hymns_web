'use client';
import { Recording } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { FileCheck, FileX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFileValidation } from './use-file-validation';
import { useFileContent } from './use-file-content';

const ValidationChip = ({ path }: { path?: string }) => {
    const { isValid, isLoading } = useFileValidation(path);

    if (!path) return null;
    if (isLoading) return <span className="text-xs text-muted-foreground">Checking...</span>;

    return (
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isValid ? <FileCheck className="h-3 w-3" /> : <FileX className="h-3 w-3" />}
            <span>{path}</span>
        </div>
    );
};

const MarkersComparison = ({ recording }: { recording: Recording }) => {
    const { content: markersFileContent, isLoading, error } = useFileContent(recording.markersUrl);

    if (isLoading) {
        return <p className="text-xs text-muted-foreground">Loading markers file...</p>;
    }
    if (error) {
        return <p className="text-xs text-red-600">Error loading markers file: {error}</p>;
    }

    const marksFromDb = recording.marks || [];
    const marksFromFile = markersFileContent ? markersFileContent.split(/[\s,]+/).map(Number).filter(n => !isNaN(n)) : [];

    const sortedDb = [...marksFromDb].sort((a, b) => a - b);
    const sortedFile = [...marksFromFile].sort((a, b) => a - b);
    const areEqual = sortedDb.length === sortedFile.length && sortedDb.every((val, index) => val === sortedFile[index]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">Markers Comparison</h4>
                {areEqual ? (
                    <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Match</span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> Mismatch</span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono p-2 border rounded-md bg-secondary/30">
                <div>
                    <h5 className="font-semibold mb-1">DB `marks` ({sortedDb.length})</h5>
                    <pre className="max-h-48 overflow-auto">{sortedDb.join('\n')}</pre>
                </div>
                <div>
                    <h5 className="font-semibold mb-1">File Content ({sortedFile.length})</h5>
                    <pre className="max-h-48 overflow-auto">{sortedFile.join('\n')}</pre>
                </div>
            </div>
        </div>
    );
}

export const RecordingDetails = ({ recording }: { recording: Recording }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Hymn ID: {recording.hymnId}</CardTitle>
                <CardDescription>Recording ID: {recording.id}</CardDescription>
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
                        <ValidationChip path={recording.audioUrl} />
                        {recording.mode === 'learn' && (
                            <>
                                <p className="pt-2"><strong>Markers File:</strong></p>
                                <ValidationChip path={recording.markersUrl} />
                            </>
                        )}
                    </div>
                </div>
                {recording.mode === 'learn' && <MarkersComparison recording={recording} />}
            </CardContent>
        </Card>
    );
};
