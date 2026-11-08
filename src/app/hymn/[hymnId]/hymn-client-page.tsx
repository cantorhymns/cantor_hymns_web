
'use client';
import { HymnPlayer } from '@/components/hymn-player';
import Link from 'next/link';
import { ChevronLeft, ListMusic, Search as SearchIcon } from 'lucide-react';
import { useHymn } from '@/lib/hooks/useHymn';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useOrderedHymns } from '@/lib/hooks/useOrderedHymns';
import { useCatalog } from '@/lib/services/catalog';
import type { Recording } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useSearch } from '@/components/search-provider';


export function HymnClientPage({ hymnId: initialHymnId }: { hymnId: string }) {
  
  const searchParams = useSearchParams();
  const initialRecordingIdFromUrl = searchParams.get('recordingId');
  const genreIdFromUrl = searchParams.get('genre');
  const { setIsOpen } = useSearch();

  const [currentHymnId, setCurrentHymnId] = useState(initialHymnId);
  const { data: hymn, isLoading: isHymnLoading } = useHymn(currentHymnId);

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
    const rawGenreId = hymn?.genreId ?? (hymn as any)?.genreIds;
    if (!rawGenreId) return undefined;
    if (Array.isArray(rawGenreId) && rawGenreId.length > 0) return rawGenreId[0];
    if (typeof rawGenreId === 'string') return rawGenreId;
    return undefined;
  }, [hymn?.genreId, (hymn as any)?.genreIds, genreIdFromUrl]);

  const { data: genre, isLoading: isGenreLoading } = useGenre(primaryGenreId);
  const { flatPlaylist: playlist, isLoading: isPlaylistLoading } = useOrderedHymns(primaryGenreId);
  const catalog = useCatalog();

  const effectivePlaylist = useMemo(() => {
    if (playlist && playlist.length > 0 && playlist.some(p => p.id === hymn?.id)) {
      return playlist;
    }
    if (hymn && catalog?.hymns && catalog.hymns.length > 0) {
      if (primaryGenreId) {
        const sameGenre = catalog.hymns.filter(h => {
          if (Array.isArray(h.genreId) && h.genreId.includes(primaryGenreId)) return true;
          if (typeof h.genreId === 'string' && h.genreId === primaryGenreId) return true;
          if (Array.isArray((h as any).genreIds) && (h as any).genreIds.includes(primaryGenreId)) return true;
          return false;
        });
        if (sameGenre.length > 0 && sameGenre.some(h => h.id === hymn.id)) {
          return sameGenre;
        }
      }
      return catalog.hymns;
    }
    return playlist || [];
  }, [playlist, hymn, catalog?.hymns, primaryGenreId]);

  const currentIndex = useMemo(() => {
    if (!effectivePlaylist || !hymn) {
        return -1;
    }
    return effectivePlaylist.findIndex((p) => p.id === hymn.id);
  }, [effectivePlaylist, hymn]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < (effectivePlaylist?.length ?? 0) - 1;
  
  const navigateToHymn = useCallback((hymnId: string) => {
    setCurrentHymnId(hymnId);
    const newUrl = `/hymn/${hymnId}?genre=${primaryGenreId}`;
    // Update URL without full page reload to preserve user gesture context for autoplay
    window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  }, [primaryGenreId]);

  const handlePrevious = useCallback(() => {
    if (hasPrevious && effectivePlaylist) {
        navigateToHymn(effectivePlaylist[currentIndex - 1].id);
    }
  }, [hasPrevious, effectivePlaylist, currentIndex, navigateToHymn]);

  const handleNext = useCallback(() => {
    if (hasNext && effectivePlaylist) {
        navigateToHymn(effectivePlaylist[currentIndex + 1].id);
    }
  }, [hasNext, effectivePlaylist, currentIndex, navigateToHymn]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const newHymnId = window.location.pathname.split('/').pop();
      if (newHymnId && newHymnId !== currentHymnId) {
        setCurrentHymnId(newHymnId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentHymnId]);

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
          genreId={primaryGenreId}
        />
      )}
    </div>
  );
}
