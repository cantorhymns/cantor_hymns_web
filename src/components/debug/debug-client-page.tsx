'use client';
import { useMemo } from 'react';
import { useHymns } from '@/lib/hooks/useHymns';
import { useRecordings } from '@/lib/hooks/useRecordings';
import { Hymn, Recording } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { HymnDetails } from './hymn-details';
import { RecordingDetails } from './recording-details';
import { useCantors } from '@/lib/hooks/useCantors';
import { useGenres } from '@/lib/hooks/useGenres';
import { useBulkFileValidation } from './use-bulk-file-validation';
import { AlertTriangle } from 'lucide-react';

export function DebugClientPage() {
    const { data: allHymns, isLoading: hymnsLoading } = useHymns();
    const { data: allRecordings, isLoading: recordingsLoading } = useRecordings();
    const { data: allCantors, isLoading: cantorsLoading } = useCantors();
    const { data: allGenres, isLoading: genresLoading } = useGenres();

    const allPaths = useMemo(() => {
        if (!allHymns || !allRecordings) return [];
        const paths: (string | undefined)[] = [];
        allHymns.forEach(h => {
            paths.push(h.lyricsArabic, h.lyricsCoptic, h.lyricsEnglish);
        });
        allRecordings.forEach(r => {
            paths.push(r.audioUrl, r.markersUrl);
        });
        return paths;
    }, [allHymns, allRecordings]);

    const { validationMap, isBulkLoading } = useBulkFileValidation(allPaths);

    const isLoading = hymnsLoading || recordingsLoading || cantorsLoading || genresLoading;

    const { hymnIssues, recordingIssues } = useMemo(() => {
        if (isBulkLoading || !allHymns || !allRecordings) {
            return { hymnIssues: 0, recordingIssues: 0 };
        }

        let hymnIssuesCount = 0;
        allHymns.forEach(h => {
            const paths = [h.lyricsEnglish, h.lyricsCoptic, h.lyricsArabic];
            if (paths.some(p => p && validationMap.get(p) === 'invalid')) {
                hymnIssuesCount++;
            }
        });

        let recordingIssuesCount = 0;
        allRecordings.forEach(r => {
            const audioInvalid = r.audioUrl && validationMap.get(r.audioUrl) === 'invalid';
            const markerInvalid = r.mode === 'learn' && r.markersUrl && validationMap.get(r.markersUrl) === 'invalid';
            if (audioInvalid || markerInvalid) {
                recordingIssuesCount++;
            }
        });

        return { hymnIssues: hymnIssuesCount, recordingIssues: recordingIssuesCount };
    }, [isBulkLoading, validationMap, allHymns, allRecordings]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!allHymns || !allRecordings || !allCantors || !allGenres) {
        return <p className="text-destructive">Failed to load necessary data for debugging.</p>;
    }

    const cantorsMap = new Map(allCantors.map(c => [c.id, c]));
    const genresMap = new Map(allGenres.map(g => [g.id, g]));

    const recordingsWithCantor = allRecordings.map(rec => ({
        ...rec,
        cantor: cantorsMap.get(rec.cantorId)
    }));

    return (
        <div className="space-y-8">
            <Accordion type="single" collapsible className="w-full" defaultValue="hymns">
                <AccordionItem value="hymns">
                    <AccordionTrigger className="text-2xl font-headline text-primary">
                        <div className="flex items-center gap-4">
                            <span>Hymns ({allHymns.length})</span>
                            {!isBulkLoading && hymnIssues > 0 && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                    <AlertTriangle className="h-4 w-4" />
                                    {hymnIssues} issue(s)
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-4">
                            {allHymns.map((hymn: Hymn) => (
                                <HymnDetails key={hymn.id} hymn={hymn} genresMap={genresMap} validationMap={validationMap} isLoading={isBulkLoading} />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="recordings">
                    <AccordionTrigger className="text-2xl font-headline text-primary">
                         <div className="flex items-center gap-4">
                            <span>Recordings ({recordingsWithCantor.length})</span>
                             {!isBulkLoading && recordingIssues > 0 && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                    <AlertTriangle className="h-4 w-4" />
                                    {recordingIssues} issue(s)
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-4">
                            {recordingsWithCantor.map((recording: Recording) => (
                                <RecordingDetails key={recording.id} recording={recording} validationMap={validationMap} isLoading={isBulkLoading} />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
