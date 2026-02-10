'use client';
import { HymnPlayer } from '@/components/hymn-player';
import Link from 'next/link';
import { ChevronLeft, ListMusic } from 'lucide-react';
import { useHymn } from '@/lib/hooks/useHymn';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useHymns } from '@/lib/hooks/useHymns';
import { useRouter } from 'next/navigation';
import type { Recording } from '@/lib/types';


export function HymnClientPage({ hymnId }: { hymnId: string }) {
  const router = useRouter();
  const { data: hymn, isLoading: isHymnLoading } = useHymn(hymnId);
  const [currentRecording, setCurrentRecording] = useState<Recording | undefined>();

  useEffect(() => {
    // Set the initial recording when the hymn data is loaded or changed.
    if (hymn?.recordings && hymn.recordings.length > 0) {
      setCurrentRecording(hymn.recordings[0]);
    }
  }, [hymn]);


  const primaryGenreId = useMemo(() => {
    if (!hymn?.genreId) return undefined;
    return Array.isArray(hymn.genreId) ? hymn.genreId[0] : hymn.genreId;
  }, [hymn?.genreId]);

  const { data: genre, isLoading: isGenreLoading } = useGenre(primaryGenreId);
  const { data: playlistHymns, isLoading: isPlaylistLoading } =
    useHymns(primaryGenreId);

  const { playlist, currentIndex } = useMemo(() => {
    if (!playlistHymns) return { playlist: [], currentIndex: -1 };
    const currentIdx = playlistHymns.findIndex((p) => p.id === hymnId);
    return { playlist: playlistHymns, currentIndex: currentIdx };
  }, [playlistHymns, hymnId]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < playlist.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const previousHymnId = playlist[currentIndex - 1].id;
      router.push(`/hymn/${previousHymnId}`);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextHymnId = playlist[currentIndex + 1].id;
      router.push(`/hymn/${nextHymnId}`);
    }
  };

  const isLoading =
    isHymnLoading ||
    (primaryGenreId && isPlaylistLoading) ||
    (hymn && !genre && isGenreLoading);

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
          <Link href={`/cantor-cloud?hymnId=${hymnId}&recordingId=${currentRecording.id}`}>
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
