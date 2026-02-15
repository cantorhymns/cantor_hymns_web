
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
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const initialRecordingIdFromUrl = searchParams.get('recordingId');
  const genreIdFromUrl = searchParams.get('genre');
  const { setIsOpen } = useSearch();

  const { data: hymn, isLoading: isHymnLoading } = useHymn(hymnId);

  const [playbackRate, setPlaybackRate] = useState(1);

  const [currentRecording, setCurrentRecording] = useState<Recording | undefined>();

  useEffect(() => {
    if (hymn?.recordings && hymn.recordings.length > 0) {
       const recFromUrl = initialRecordingIdFromUrl ? hymn.recordings.find(r => r.id === initialRecordingIdFromUrl) : undefined;
       const selectedRec = recFromUrl || hymn.recordings[0];
       if (selectedRec?.id !== currentRecording?.id) {
          setCurrentRecording(selectedRec);
       }
    }
  }, [hymn, initialRecordingIdFromUrl, currentRecording]);

  const primaryGenreId = useMemo(() => {
    if (genreIdFromUrl) {
      return genreIdFromUrl;
    }
    if (!hymn?.genreId) return undefined;
    return Array.isArray(hymn.genreId) ? hymn.genreId[0] : hymn.genreId;
  }, [hymn?.genreId, genreIdFromUrl]);

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
        router.push(`/hymn/${playlist[currentIndex - 1].id}?genre=${primaryGenreId}`);
    }
  }, [hasPrevious, playlist, currentIndex, router, primaryGenreId]);

  const handleNext = useCallback(() => {
    if (hasNext && playlist) {
        router.push(`/hymn/${playlist[currentIndex + 1].id}?genre=${primaryGenreId}`);
    }
  }, [hasNext, playlist, currentIndex, router, primaryGenreId]);

  const isLoading = isHymnLoading || isPlaylistLoading || isGenreLoading;

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
          key={hymn.id}
          hymn={hymn}
          autoplay={true}
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
        />
      )}
    </div>
  );
}
