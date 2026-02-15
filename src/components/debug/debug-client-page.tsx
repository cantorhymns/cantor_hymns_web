'use client';
import { useMemo } from 'react';
import { useHymns } from '@/lib/hooks/useHymns';
import { useRecordings } from '@/lib/hooks/useRecordings';
import { Genre, Hymn, Recording } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { HymnDetails } from './hymn-details';
import { RecordingDetails } from './recording-details';
import { useCantors } from '@/lib/hooks/useCantors';
import { useGenres } from '@/lib/hooks/useGenres';
import { useBulkFileValidation } from './use-bulk-file-validation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { GenreDetails } from './genre-details';

export function DebugClientPage() {
    const { data: allHymns, isLoading: hymnsLoading } = useHymns();
    const { data: allRecordings, isLoading: recordingsLoading } = useRecordings();
    const { data: allCantors, isLoading: cantorsLoading } = useCantors();
    const { data: allGenres, isLoading: genresLoading } = useGenres();

    const allFilePaths = useMemo(() => {
        if (!allHymns || !allRecordings || !allGenres) return [];
        const paths: (string | undefined)[] = [];
        allGenres.forEach(g => {
            paths.push(g.backgroundUrl, g.contentUrl);
        });
        allHymns.forEach(h => {
            paths.push(h.lyricsArabic, h.lyricsCoptic, h.lyricsEnglish);
        });
        allRecordings.forEach(r => {
            paths.push(r.audioUrl, r.markersUrl);
        });
        return paths;
    }, [allHymns, allRecordings, allGenres]);

    const { validationMap, isBulkLoading } = useBulkFileValidation(allFilePaths);
    
    const isLoading = hymnsLoading || recordingsLoading || cantorsLoading || genresLoading;

    const { genreIssues, hymnIssues, recordingIssues } = useMemo(() => {
        if (isBulkLoading || !allHymns || !allRecordings || !allGenres) {
            return { genreIssues: 0, hymnIssues: 0, recordingIssues: 0 };
        }

        let genreIssuesCount = 0;
        allGenres.forEach(g => {
            const paths = [g.backgroundUrl, g.contentUrl];
            if (paths.some(p => p && validationMap.get(p) === 'invalid')) {
                genreIssuesCount++;
            }
        });

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
            let markerIssue = false;

            if (r.mode === 'learn') {
                const markersFileInvalid = !r.markersUrl || validationMap.get(r.markersUrl) === 'invalid';
                markerIssue = markersFileInvalid;
            }

            if (audioInvalid || markerIssue) {
                recordingIssuesCount++;
            }
        });

        return { genreIssues: genreIssuesCount, hymnIssues: hymnIssuesCount, recordingIssues: recordingIssuesCount };
    }, [isBulkLoading, validationMap, allHymns, allRecordings, allGenres]);

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
            <Accordion type="single" collapsible className="w-full" defaultValue="genres">
                <AccordionItem value="genres">
                    <AccordionTrigger className="text-2xl font-headline text-primary">
                        <div className="flex items-center gap-4">
                            <span>Genres ({allGenres.length})</span>
                            {!isBulkLoading && genreIssues > 0 && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                    <AlertTriangle className="h-4 w-4" />
                                    {genreIssues} issue(s)
                                </span>
                            )}
                             {!isBulkLoading && genreIssues === 0 && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
                                    <CheckCircle2 className="h-4 w-4" />
                                    No issues
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-4">
                            {allGenres.map((genre: Genre) => (
                                <GenreDetails key={genre.id} genre={genre} validationMap={validationMap} isLoading={isBulkLoading} />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
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
                             {!isBulkLoading && hymnIssues === 0 && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
                                    <CheckCircle2 className="h-4 w-4" />
                                    No issues
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
                            {!isBulkLoading && recordingIssues === 0 && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
                                    <CheckCircle2 className="h-4 w-4" />
                                    No issues
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
