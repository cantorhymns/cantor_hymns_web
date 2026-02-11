
'use client';
import { HymnPlayer } from '@/components/hymn-player';
import Link from 'next/link';
import { ChevronLeft, ListMusic } from 'lucide-react';
import { useHymn } from '@/lib/hooks/useHymn';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useHymns } from '@/lib/hooks/useHymns';
import { useRouter } from 'next/navigation';
import type { Hymn, Recording } from '@/lib/types';


export function HymnClientPage({ hymnId }: { hymnId: string }) {
  const router = useRouter();
  
  // Use a state for the hymn being displayed.
  const [hymn, setHymn] = useState<Hymn | null>(null);

  // Fetch the initial hymn based on the URL parameter.
  const { data: initialHymnData, isLoading: isInitialHymnLoading } = useHymn(hymnId);

  // Once the initial hymn is loaded, set it as the current hymn.
  useEffect(() => {
    if (initialHymnData) {
      setHymn(initialHymnData);
    }
  }, [initialHymnData]);
  
  const [currentRecording, setCurrentRecording] = useState<Recording | undefined>();

  useEffect(() => {
    // When the current hymn changes, update the recording.
    if (hymn?.recordings && hymn.recordings.length > 0) {
      setCurrentRecording(hymn.recordings[0]);
    }
  }, [hymn]);

  // Use the initial hymn's genre to fetch the correct playlist, so it doesn't change during navigation.
  const primaryGenreId = useMemo(() => {
    if (!initialHymnData?.genreId) return undefined;
    return Array.isArray(initialHymnData.genreId) ? initialHymnData.genreId[0] : initialHymnData.genreId;
  }, [initialHymnData?.genreId]);

  const { data: genre, isLoading: isGenreLoading } = useGenre(primaryGenreId);
  const { data: playlistHymns, isLoading: isPlaylistLoading } = useHymns(primaryGenreId);

  const { playlist, currentIndex } = useMemo(() => {
    if (!playlistHymns || !hymn) return { playlist: [], currentIndex: -1 };
    const currentIdx = playlistHymns.findIndex((p) => p.id === hymn.id);
    return { playlist: playlistHymns, currentIndex: currentIdx };
  }, [playlistHymns, hymn]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < playlist.length - 1;

  // Handle previous without a full page reload.
  const handlePrevious = useCallback(() => {
    if (hasPrevious && playlist) {
      const previousHymn = playlist[currentIndex - 1];
      setHymn(previousHymn); // Update the state
      router.push(`/hymn/${previousHymn.id}`, { scroll: false }); // Update URL without reload
    }
  }, [hasPrevious, playlist, currentIndex, router]);

  // Handle next without a full page reload.
  const handleNext = useCallback(() => {
    if (hasNext && playlist) {
      const nextHymn = playlist[currentIndex + 1];
      setHymn(nextHymn); // Update the state
      router.push(`/hymn/${nextHymn.id}`, { scroll: false }); // Update URL without reload
    }
  }, [hasNext, playlist, currentIndex, router]);

  // Loading is true until the first hymn is loaded and set in state.
  const isLoading = isInitialHymnLoading || (initialHymnData && !hymn);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex justify-between items-center">
        {isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : genre ? (
          <Link
            href={`/hymns/${genre.id}`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to {genre.name}
          </Link>
        ) : (
          <div />
        )}

        {hymn && currentRecording && (
          <Link href={`/cantor-cloud?hymnId=${hymn.id}&recordingId=${currentRecording.id}`}>
            <Button>
              <ListMusic className="mr-2 h-4 w-4" />
              Play in CantorCloud
            </Button>
          </Link>
        )}
      </div>

      {isLoading || !hymn ? (
        <div className="w-full max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-full max-w-md" />
            </div>
            <Skeleton className="h-10 w-[180px]" />
          </div>
          <Skeleton className="w-full h-20 rounded-lg" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <div className="flex items-center gap-6 mt-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        <HymnPlayer
          hymn={hymn}
          autoplay={true}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onRecordingChange={setCurrentRecording}
        />
      )}
    </div>
  );
}
