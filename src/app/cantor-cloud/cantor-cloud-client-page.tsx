
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenres } from '@/lib/hooks/useGenres';
import { useCantors } from '@/lib/hooks/useCantors';
import { useRecordings } from '@/lib/hooks/useRecordings';
import { Hymn, Recording } from '@/lib/types';
import { HymnPlayer } from '@/components/hymn-player';
import { Playlist } from '@/components/playlist';
import { ListMusic } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CopticCrossIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="currentColor"
    {...props}
  >
    <circle cx="50" cy="50" r="6" />
    <path d="M47 10h6v80h-6z" />
    <path d="M10 47h80v6H10z" />
    <circle cx="50" cy="15" r="4" />
    <circle cx="42" cy="15" r="4" />
    <circle cx="58" cy="15" r="4" />
    <circle cx="50" cy="85" r="4" />
    <circle cx="42" cy="85" r="4" />
    <circle cx="58" cy="85" r="4" />
    <circle cx="15" cy="50" r="4" />
    <circle cx="15" cy="42" r="4" />
    <circle cx="15" cy="58" r="4" />
    <circle cx="85" cy="50" r="4" />
    <circle cx="85" cy="42" r="4" />
    <circle cx="85" cy="58" r="4" />
  </svg>
);

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function CantorCloudClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [playlist, setPlaylist] = useState<Hymn[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentHymn, setCurrentHymn] = useState<Hymn | null>(null);

  const { data: allHymns, isLoading: hymnsLoading } = useHymns();
  const { data: allGenres, isLoading: genresLoading } = useGenres();
  const { data: allCantors, isLoading: cantorsLoading } = useCantors();
  const { data: allRecordings, isLoading: recordingsLoading } = useRecordings();

  const allHymnsWithRecordings = useMemo(() => {
    if (!allHymns || !allRecordings || !allCantors) return null;

    const recordingsByHymnId = new Map<string, Recording[]>();
    allRecordings.forEach(rec => {
        if (!recordingsByHymnId.has(rec.hymnId)) {
            recordingsByHymnId.set(rec.hymnId, []);
        }
        recordingsByHymnId.get(rec.hymnId)!.push(rec);
    });

    const cantorsMap = new Map(allCantors.map(c => [c.id, c]));

    const populatedHymns = allHymns.map(hymn => {
        const hymnRecordings = recordingsByHymnId.get(hymn.id) || [];
        const populatedRecordings = hymnRecordings.map(rec => ({
            ...rec,
            cantor: cantorsMap.get(rec.cantorId)
        }));
        
        return {
            ...hymn,
            recordings: populatedRecordings
        };
    });

    // Ensure only hymns with active recordings are considered.
    return populatedHymns.filter(hymn => hymn.recordings.length > 0);
  }, [allHymns, allRecordings, allCantors]);

  const activeHymnsForCloud = useMemo(() => {
    if (!allHymnsWithRecordings || !allGenres || !allCantors) return [];
  
    const activeGenreIds = new Set(
      allGenres.filter(g => g.cantorCloudActive).map(g => g.id)
    );
    const activeCantorIds = new Set(
      allCantors.filter(c => c.cantorCloudActive).map(c => c.id)
    );
  
    const hymnsWithFilteredRecordings = allHymnsWithRecordings.map(hymn => {
      // Pick a random cantor for each hymn.
      if (hymn.recordings && hymn.recordings.length > 0) {
        const activeCantorRecordings = hymn.recordings.filter(rec => activeCantorIds.has(rec.cantorId));
        if (activeCantorRecordings.length > 0) {
            const randomIndex = Math.floor(Math.random() * activeCantorRecordings.length);
            const randomRecording = activeCantorRecordings[randomIndex];
            // Put the random recording first.
            return { ...hymn, recordings: [randomRecording, ...activeCantorRecordings.filter(r => r.id !== randomRecording.id)] };
        }
      }
      // If no active cantor recordings, filter out the hymn's recordings.
      return { ...hymn, recordings: [] };
    });
  
    return hymnsWithFilteredRecordings.filter(hymn => {
      const hasActiveGenre = hymn.genreId.some(gId => activeGenreIds.has(gId));
      return hasActiveGenre && hymn.recordings.length > 0;
    });
  }, [allHymnsWithRecordings, allGenres, allCantors]);

  useEffect(() => {
    if (hymnsLoading || genresLoading || cantorsLoading || recordingsLoading || !allHymnsWithRecordings) return;

    if (isInitialLoad) {
      const startHymnId = searchParams.get('hymnId');
      const startRecordingId = searchParams.get('recordingId');
      let newPlaylist: Hymn[] = [];

      if (startHymnId) {
        const startHymn = allHymnsWithRecordings.find(h => h.id === startHymnId);
        if (startHymn) {
          // If a specific recording is requested, make it the first one for that hymn.
          if (startRecordingId && startHymn.recordings) {
            const targetRecording = startHymn.recordings.find(r => r.id === startRecordingId);
            if (targetRecording) {
              startHymn.recordings = [
                targetRecording,
                ...startHymn.recordings.filter(r => r.id !== startRecordingId)
              ];
            }
          }
          const otherHymns = activeHymnsForCloud.filter(h => h.id !== startHymnId);
          const shuffledOtherHymns = shuffleArray(otherHymns);
          
          newPlaylist = [startHymn, ...shuffledOtherHymns];
        } else {
          newPlaylist = shuffleArray(activeHymnsForCloud);
        }
      } else {
        newPlaylist = shuffleArray(activeHymnsForCloud);
      }
      
      if (newPlaylist.length > 0) {
        setPlaylist(newPlaylist);
        setCurrentHymn(newPlaylist[0]);
        setCurrentIndex(0);
      }
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, activeHymnsForCloud, allHymnsWithRecordings, searchParams, hymnsLoading, genresLoading, cantorsLoading, recordingsLoading]);

  
  const handleHymnChange = useCallback((newIndex: number) => {
    const newHymn = playlist[newIndex];
    if (newHymn) {
        setCurrentHymn(newHymn);
        setCurrentIndex(newIndex);
    }
  }, [playlist]);
  
  const handleNext = useCallback(() => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.play().catch(() => {});
    }
    handleHymnChange((currentIndex + 1) % playlist.length);
  }, [currentIndex, playlist.length, handleHymnChange]);

  const handlePrevious = useCallback(() => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.play().catch(() => {});
    }
    handleHymnChange((currentIndex - 1 + playlist.length) % playlist.length);
  }, [currentIndex, playlist.length, handleHymnChange]);

  const handleSelectTrack = (index: number) => {
    handleHymnChange(index);
  };

  const isLoading = hymnsLoading || genresLoading || cantorsLoading || recordingsLoading || isInitialLoad;
  const showPlayer = !isLoading && currentHymn && (currentHymn.recordings?.length ?? 0) > 0;
  
  // Get the recordingId for the URL if coming from the hymn page initially
  const initialRecordingId = useMemo(() => {
    if (isInitialLoad) {
      return searchParams.get('recordingId');
    }
    // For subsequent tracks, use the first (randomized) recording in the list
    return currentHymn?.recordings?.[0]?.id;
  }, [isInitialLoad, searchParams, currentHymn]);


  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="text-center mb-12">
        <CopticCrossIcon className="h-20 w-20 text-primary inline-block" />
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight mt-4">
          CantorCloud
        </h1>
      </div>
      {showPlayer ? (
        <div className="w-full max-w-3xl mx-auto">
          <HymnPlayer
            hymn={currentHymn}
            initialRecordingId={initialRecordingId ?? undefined}
            onEnded={handleNext}
            autoplay={true}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={playlist.length > 1}
            hasPrevious={playlist.length > 1}
            lyricsVisibleByDefault={false}
            showLyricsToggleButton={true}
          />
          <Playlist
            playlist={playlist}
            currentIndex={currentIndex}
            onSelectTrack={handleSelectTrack}
          />
        </div>
      ) : (
        <div className="w-full max-w-3xl mx-auto">
          <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
            <ListMusic className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-semibold">No Hymns to Play</h2>
            <p className="mt-2 text-muted-foreground">
              {isLoading
                ? 'Loading hymns...'
                : 'There might be no active hymns available.'}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
