
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenres } from '@/lib/hooks/useGenres';
import { useCantors } from '@/lib/hooks/useCantors';
import { Hymn } from '@/lib/types';
import { HymnPlayer } from '@/components/hymn-player';
import { Playlist } from '@/components/playlist';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  ListMusic,
  X,
  ChevronDown,
} from 'lucide-react';
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

  // State for filters and playback
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedCantorIds, setSelectedCantorIds] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [playlist, setPlaylist] = useState<Hymn[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [autoplay, setAutoplay] = useState(false);

  // Data fetching
  const { data: allHymns, isLoading: hymnsLoading } = useHymns();
  const { data: allGenres, isLoading: genresLoading } = useGenres();
  const { data: allCantors, isLoading: cantorsLoading } = useCantors();

  // Create a set of cantor IDs that have active recordings
  const activeCantorIdsWithHymns = useMemo(() => {
    if (!allHymns) return new Set<string>();
    const cantorIds = new Set<string>();
    allHymns.forEach((hymn) => {
      (hymn.recordings || []).forEach((rec) => {
        cantorIds.add(rec.cantorId);
      });
    });
    return cantorIds;
  }, [allHymns]);

  // Filter cantors and genres for the dropdowns
  const filteredCantors = useMemo(() => {
    if (!allCantors) return [];
    return allCantors.filter(
      (c) => c.cantorCloudActive && activeCantorIdsWithHymns.has(c.id)
    );
  }, [allCantors, activeCantorIdsWithHymns]);

  const filteredGenres = useMemo(() => {
    if (!allGenres) return [];
    return allGenres.filter((g) => g.cantorCloudActive);
  }, [allGenres]);

  // Populate cantor details into each hymn's recordings
  const hymnsWithPopulatedCantors = useMemo(() => {
    if (!allHymns || !allCantors) return null;
    const cantorsMap = new Map(allCantors.map((c) => [c.id, c]));
    return allHymns.map((hymn) => ({
      ...hymn,
      recordings: (hymn.recordings || [])
        .map((rec) => ({
          ...rec,
          cantor: cantorsMap.get(rec.cantorId),
        }))
        .sort((a, b) => {
          if (a.mode === 'learn' && b.mode !== 'learn') return -1;
          if (a.mode !== 'learn' && b.mode === 'learn') return 1;
          const rankA = a.cantor?.rank ?? 99;
          const rankB = b.cantor?.rank ?? 99;
          return rankA - rankB;
        }),
    }));
  }, [allHymns, allCantors]);
  
  // Create a list of hymns that are eligible for CantorCloud
  const activeHymnsForCloud = useMemo(() => {
    if (!hymnsWithPopulatedCantors || !allGenres || !allCantors) return [];

    const activeGenreIds = new Set(
        allGenres.filter(g => g.cantorCloudActive).map(g => g.id)
    );
    const activeCantorIds = new Set(
        allCantors.filter(c => c.cantorCloudActive).map(c => c.id)
    );

    return hymnsWithPopulatedCantors.filter(hymn => {
        const hasActiveGenre = hymn.genreId.some(gId => activeGenreIds.has(gId));
        const hasActiveCantorRecording = (hymn.recordings || []).some(rec => activeCantorIds.has(rec.cantorId));
        return hasActiveGenre && hasActiveCantorRecording;
    });
  }, [hymnsWithPopulatedCantors, allGenres, allCantors]);

  // Effect to initialize filters from URL or to select all
  useEffect(() => {
    if (filteredGenres.length > 0 && filteredCantors.length > 0 && !filtersInitialized) {
        const genreIdFromParams = searchParams.get('genreId');
        if (genreIdFromParams) {
             setSelectedGenreIds([genreIdFromParams]);
             setSelectedCantorIds(filteredCantors.map(c => c.id));
        } else {
            setSelectedGenreIds(filteredGenres.map((g) => g.id));
            setSelectedCantorIds(filteredCantors.map((c) => c.id));
        }
        setFiltersInitialized(true);
    }
  }, [filteredGenres, filteredCantors, filtersInitialized, searchParams]);

  // Main playlist management effect
  useEffect(() => {
    // Guard: wait for all data to be ready
    if (!hymnsWithPopulatedCantors || !filtersInitialized) return;

    // --- A: INITIAL PLAYLIST CREATION ---
    if (isInitialLoad) {
      const startHymnId = searchParams.get('hymnId');
      let newPlaylist: Hymn[] = [];
      let newAutoplay = false;

      if (startHymnId) {
        // A1: Coming from a specific hymn page
        const startHymn = allHymns?.find(h => h.id === startHymnId);
        if (startHymn) {
          const otherHymns = shuffleArray(activeHymnsForCloud.filter(h => h.id !== startHymnId)).slice(0, 19);
          newPlaylist = [startHymn, ...otherHymns];
        } else {
          newPlaylist = shuffleArray(activeHymnsForCloud).slice(0, 20); // Fallback
        }
        newAutoplay = true; // Play immediately when coming from a link
      } else {
        // A2: General load (with potential genre filter from URL)
        const initialFilteredHymns = activeHymnsForCloud.filter(hymn =>
          hymn.genreId.some(gId => selectedGenreIds.includes(gId))
        );
        
        if (searchParams.get('genreId')) {
          newPlaylist = shuffleArray(initialFilteredHymns);
        } else {
          newPlaylist = shuffleArray(initialFilteredHymns).slice(0, 20);
        }
      }
      
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
      setAutoplay(newAutoplay);
      setIsInitialLoad(false); // Mark initial load as done
      return;
    }

    // --- B: PLAYLIST UPDATE ON FILTER CHANGE ---
    // This part runs only after the initial load
    const currentlyPlaying = playlist[currentIndex];

    const newFilteredHymns = activeHymnsForCloud.filter(hymn => {
      const genreMatch = selectedGenreIds.some(gId => hymn.genreId.includes(gId));
      const cantorMatch = (hymn.recordings || []).some(r => selectedCantorIds.includes(r.cantorId));
      return genreMatch && cantorMatch;
    });

    const isCurrentHymnStillValid = currentlyPlaying && newFilteredHymns.some(h => h.id === currentlyPlaying.id);

    if (isCurrentHymnStillValid) {
      // B1: Current hymn is still in the list. Update the "up next" queue around it.
      const newUpNext = shuffleArray(newFilteredHymns.filter(h => h.id !== currentlyPlaying.id));
      setPlaylist([currentlyPlaying, ...newUpNext]);
      setCurrentIndex(0); 
    } else {
      // B2: Current hymn was filtered out. Create a new playlist.
      setPlaylist(shuffleArray(newFilteredHymns));
      setCurrentIndex(0);
    }
  }, [selectedGenreIds, selectedCantorIds, isInitialLoad]);

  const currentHymn = playlist?.[currentIndex];

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

  const isLoading = hymnsLoading || genresLoading || cantorsLoading || !filtersInitialized;
  const showPlayer = !isLoading && currentHymn;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 w-full">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[180px]">
                        Genres ({selectedGenreIds.length})
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Genre</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {filteredGenres?.map((g) => (
                        <DropdownMenuCheckboxItem
                            key={g.id}
                            checked={selectedGenreIds.includes(g.id)}
                            onCheckedChange={(checked) => {
                                return checked
                                    ? setSelectedGenreIds((prev) => [...prev, g.id])
                                    : setSelectedGenreIds((prev) => prev.filter((id) => id !== g.id));
                            }}
                        >
                            {g.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-[180px]">
                        Cantors ({selectedCantorIds.length})
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Cantor</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {filteredCantors?.map((c) => (
                        <DropdownMenuCheckboxItem
                            key={c.id}
                            checked={selectedCantorIds.includes(c.id)}
                            onCheckedChange={(checked) => {
                                return checked
                                    ? setSelectedCantorIds((prev) => [...prev, c.id])
                                    : setSelectedCantorIds((prev) => prev.filter((id) => id !== c.id));
                            }}
                        >
                            {c.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {showPlayer ? (
        <div className="w-full max-w-3xl mx-auto">
          <HymnPlayer
            key={currentHymn.id}
            hymn={currentHymn}
            onEnded={handleNext}
            autoplay={autoplay}
            onAutoplayConsumed={() => setAutoplay(false)}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={playlist.length > 1}
            hasPrevious={playlist.length > 1}
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
                : 'Try adjusting your filters or there might be no hymns available.'}
            </p>
            {(!isLoading && (selectedGenreIds.length < filteredGenres.length || selectedCantorIds.length < filteredCantors.length)) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedGenreIds(filteredGenres.map(g => g.id));
                  setSelectedCantorIds(filteredCantors.map(c => c.id));
                }}
              >
                <X className="mr-2 h-4 w-4" /> Reset Filters
              </Button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
