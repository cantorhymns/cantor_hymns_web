
'use client';
import { HymnPlayer } from '@/components/hymn-player';
import Link from 'next/link';
import { ChevronLeft, ListMusic, Share2, Search as SearchIcon } from 'lucide-react';
import { useHymn } from '@/lib/hooks/useHymn';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useOrderedHymns } from '@/lib/hooks/useOrderedHymns';
import type { Hymn, Recording } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BookText } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearch } from '@/components/search-provider';


export function HymnClientPage({ hymnId }: { hymnId: string }) {
  
  const searchParams = useSearchParams();
  const initialRecordingIdFromUrl = searchParams.get('recordingId');
  const genreIdFromUrl = searchParams.get('genre');
  const { setIsOpen } = useSearch();

  // Use a state for the hymn being displayed.
  const [hymn, setHymn] = useState<Hymn | null>(null);

  // Fetch the initial hymn based on the URL parameter.
  const { data: initialHymnData, isLoading: isInitialHymnLoading } = useHymn(hymnId);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [userInitiatedPlay, setUserInitiatedPlay] = useState(false);

  // Once the initial hymn is loaded, set it as the current hymn.
  useEffect(() => {
    if (initialHymnData) {
      setHymn(initialHymnData);
      setUserInitiatedPlay(false); // Reset autoplay trigger on initial load.
    }
  }, [initialHymnData]);
  
  const [currentRecording, setCurrentRecording] = useState<Recording | undefined>();

  useEffect(() => {
    if (hymn?.recordings && hymn.recordings.length > 0) {
       const recFromUrl = initialRecordingIdFromUrl ? hymn.recordings.find(r => r.id === initialRecordingIdFromUrl) : undefined;
       const selectedRec = recFromUrl || hymn.recordings[0];
       // Only update if the recording is actually different to avoid extra re-renders
       if (selectedRec?.id !== currentRecording?.id) {
          setCurrentRecording(selectedRec);
       }
    }
  }, [hymn, initialRecordingIdFromUrl, currentRecording]);

  const primaryGenreId = useMemo(() => {
    if (genreIdFromUrl) {
      return genreIdFromUrl;
    }
    if (!initialHymnData?.genreId) return undefined;
    return Array.isArray(initialHymnData.genreId) ? initialHymnData.genreId[0] : initialHymnData.genreId;
  }, [initialHymnData?.genreId, genreIdFromUrl]);

  const { data: genre, isLoading: isGenreLoading } = useGenre(primaryGenreId);
  const { flatPlaylist: playlist, isLoading: isPlaylistLoading } = useOrderedHymns(primaryGenreId);

  const currentIndex = useMemo(() => {
    if (!playlist || !hymn) {
        return -1;
    }
    return playlist.findIndex((p) => p.id === hymn.id);
  }, [playlist, hymn]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < (playlist?.length ?? 0) - 1;

  const handlePrevious = useCallback(() => {
    if (hasPrevious && playlist) {
        setUserInitiatedPlay(true);
        const previousHymn = playlist[currentIndex - 1];
        setHymn(previousHymn);
    }
  }, [hasPrevious, playlist, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && playlist) {
        setUserInitiatedPlay(true);
        const nextHymn = playlist[currentIndex + 1];
        setHymn(nextHymn);
    }
  }, [hasNext, playlist, currentIndex]);

  const isLoading = isInitialHymnLoading || isPlaylistLoading || isGenreLoading || (initialHymnData && !hymn);

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

      <div className="w-full max-w-xl mx-auto mb-8">
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setIsOpen(true)}>
            <SearchIcon className="mr-2 h-4 w-4" />
            Search hymns, genres, cantors...
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
            </kbd>
        </Button>
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
          autoplay={userInitiatedPlay}
          onAutoplayConsumed={() => setUserInitiatedPlay(false)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onEnded={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onRecordingChange={setCurrentRecording}
          showLyricsToggleButton={true}
          initialRecordingId={initialRecordingIdFromUrl ?? undefined}
          playbackRate={playbackRate}
          onPlaybackRateChange={setPlaybackRate}
          genreId={primaryGenreId}
          onManualPlay={() => setUserInitiatedPlay(true)}
        />
      )}
    </div>
  );
}
