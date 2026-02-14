
'use client';

import { useHymns } from '@/lib/hooks/useHymns';
import { useRecordings } from '@/lib/hooks/useRecordings';
import { Hymn, Recording } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { HymnDetails } from './hymn-details';
import { RecordingDetails } from './recording-details';
import { useCantors } from '@/lib/hooks/useCantors';
import { useGenres } from '@/lib/hooks/useGenres';

export function DebugClientPage() {
    const { data: allHymns, isLoading: hymnsLoading } = useHymns();
    const { data: allRecordings, isLoading: recordingsLoading } = useRecordings();
    const { data: allCantors, isLoading: cantorsLoading } = useCantors();
    const { data: allGenres, isLoading: genresLoading } = useGenres();

    const isLoading = hymnsLoading || recordingsLoading || cantorsLoading || genresLoading;

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
                        Hymns ({allHymns.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-4">
                            {allHymns.map((hymn: Hymn) => (
                                <HymnDetails key={hymn.id} hymn={hymn} genresMap={genresMap} />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="recordings">
                    <AccordionTrigger className="text-2xl font-headline text-primary">
                        Recordings ({recordingsWithCantor.length})
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-4">
                            {recordingsWithCantor.map((recording: Recording) => (
                                <RecordingDetails key={recording.id} recording={recording} />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
