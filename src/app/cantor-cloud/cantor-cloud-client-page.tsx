
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenres } from '@/lib/hooks/useGenres';
import { useCantors } from '@/lib/hooks/useCantors';
import { useRecordings } from '@/lib/hooks/useRecordings';
import { Hymn, Recording } from '@/lib/types';
import { HymnPlayer } from '@/components/hymn-player';
import { Playlist } from '@/components/playlist';
import { ListMusic } from 'lucide-react';
import { Card } from '@/components/ui/card';

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

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [playlist, setPlaylist] = useState<Hymn[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [autoplay, setAutoplay] = useState(false);

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

    return allHymns.map(hymn => {
        const hymnRecordings = recordingsByHymnId.get(hymn.id) || [];
        const populatedRecordings = hymnRecordings.map(rec => ({
            ...rec,
            cantor: cantorsMap.get(rec.cantorId)
        }));

        // Shuffle recordings for each hymn to add variety
        if (populatedRecordings.length > 1) {
            for (let i = populatedRecordings.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [populatedRecordings[i], populatedRecordings[j]] = [populatedRecordings[j], populatedRecordings[i]];
            }
        }

        return {
            ...hymn,
            recordings: populatedRecordings
        };
    }).filter(hymn => hymn.recordings.length > 0);
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
      const filteredRecordings = (hymn.recordings || []).filter(rec => activeCantorIds.has(rec.cantorId));
      return { ...hymn, recordings: filteredRecordings };
    });
  
    return hymnsWithFilteredRecordings.filter(hymn => {
      const hasActiveGenre = hymn.genreId.some(gId => activeGenreIds.has(gId));
      const hasActiveCantorRecording = hymn.recordings.length > 0;
      return hasActiveGenre && hasActiveCantorRecording;
    });
  }, [allHymnsWithRecordings, allGenres, allCantors]);

  useEffect(() => {
    if (hymnsLoading || genresLoading || cantorsLoading || recordingsLoading || !allHymnsWithRecordings) return;

    if (isInitialLoad) {
      const startHymnId = searchParams.get('hymnId');
      let newPlaylist: Hymn[] = [];
      let newAutoplay = false;

      const activeHymnsWithShuffledRecordings = activeHymnsForCloud.map(hymn => {
        if (hymn.recordings && hymn.recordings.length > 1) {
            return { ...hymn, recordings: shuffleArray(hymn.recordings) };
        }
        return hymn;
      });

      if (startHymnId) {
        const startHymn = allHymnsWithRecordings.find(h => h.id === startHymnId);
        if (startHymn) {
          const otherHymns = activeHymnsWithShuffledRecordings.filter(h => h.id !== startHymnId);
          const shuffledOtherHymns = shuffleArray(otherHymns).slice(0, 19);
          
          newPlaylist = [startHymn, ...shuffledOtherHymns];
          newAutoplay = true;
        } else {
          newPlaylist = shuffleArray(activeHymnsWithShuffledRecordings).slice(0, 20);
        }
      } else {
        newPlaylist = shuffleArray(activeHymnsWithShuffledRecordings).slice(0, 20);
      }
      
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
      setAutoplay(newAutoplay);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, activeHymnsForCloud, allHymnsWithRecordings, searchParams, hymnsLoading, genresLoading, cantorsLoading, recordingsLoading]);

  const currentHymn = playlist?.[currentIndex];
  const startRecordingId = searchParams.get('recordingId');

  const handleNext = useCallback(() => {
    setAutoplay(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % playlist.length);
  }, [playlist.length]);

  const handlePrevious = () => {
    setAutoplay(true);
    setCurrentIndex(
      (prevIndex) =>
        (prevIndex - 1 + playlist.length) % playlist.length
    );
  };

  const handleSelectTrack = (index: number) => {
    setAutoplay(true);
    setCurrentIndex(index);
  };

  const isLoading = hymnsLoading || genresLoading || cantorsLoading || recordingsLoading || isInitialLoad;
  const showPlayer = !isLoading && currentHymn && (currentHymn.recordings?.length ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8" />
      {showPlayer ? (
        <div className="w-full max-w-3xl mx-auto">
          <HymnPlayer
            key={currentHymn.id}
            hymn={currentHymn}
            initialRecordingId={currentIndex === 0 ? startRecordingId ?? undefined : undefined}
            onEnded={handleNext}
            autoplay={autoplay}
            onAutoplayConsumed={() => setAutoplay(false)}
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
