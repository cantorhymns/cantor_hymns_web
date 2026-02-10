
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
  const [initialHymnSet, setInitialHymnSet] = useState(false);
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

  // Initialize filters once data is loaded
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

  // Build playlist based on filters
  useEffect(() => {
    if (!hymnsWithPopulatedCantors || !filtersInitialized) return;
    
    // Once filters are initialized, it's no longer the "initial load" for subsequent changes.
    if (filtersInitialized && isInitialLoad) {
      setIsInitialLoad(false);
    }

    const startHymnId = searchParams.get('hymnId');

    // SPECIAL CASE: "Play in CantorCloud" from a hymn page
    if (startHymnId && !searchParams.get('genreId')) {
      const startHymn = hymnsWithPopulatedCantors.find((h) => h.id === startHymnId);
      
      if (startHymn) {
        const otherHymns = activeHymnsForCloud.filter((h) => h.id !== startHymnId);
        const random19 = shuffleArray(otherHymns).slice(0, 19);
        setPlaylist([startHymn, ...random19]);
      } else {
        // Fallback if start hymn not found
        setPlaylist(shuffleArray(activeHymnsForCloud).slice(0, 20));
      }
      
      setCurrentIndex(0);
      setInitialHymnSet(false);
      return;
    }

    // DEFAULT CASE: Normal CantorCloud usage with filters
    const finalFilteredHymns = activeHymnsForCloud.filter(hymn => {
        const genreIdSet = new Set(selectedGenreIds);
        const cantorIdSet = new Set(selectedCantorIds);

        // A hymn must belong to one of the selected genres
        const genreMatch = hymn.genreId.some(gId => genreIdSet.has(gId));
        // And have a recording by one of the selected cantors
        const cantorMatch = (hymn.recordings || []).some(r => cantorIdSet.has(r.cantorId));
        
        return genreMatch && cantorMatch;
    });
    
    // On the very first load of the main CantorCloud page, show a random 20.
    // Otherwise, show all hymns that match the current filters.
    if (isInitialLoad && !startHymnId && !searchParams.get('genreId')) {
      setPlaylist(shuffleArray(finalFilteredHymns).slice(0, 20));
    } else {
      setPlaylist(finalFilteredHymns);
    }
    
    setCurrentIndex(0);
    setInitialHymnSet(false);

  }, [hymnsWithPopulatedCantors, activeHymnsForCloud, selectedGenreIds, selectedCantorIds, filtersInitialized, searchParams, isInitialLoad]);

  // Set initial hymn from URL params once playlist is ready
  useEffect(() => {
    if (playlist.length > 0 && !initialHymnSet) {
      const startHymnId = searchParams.get('hymnId');
      if (startHymnId) {
        // The starting hymn is already at index 0 from the previous effect.
        const startIndex = playlist.findIndex((h) => h.id === startHymnId);
        if (startIndex !== -1) {
          setCurrentIndex(startIndex);
          setAutoplay(true);
        } else {
           // If the hymn isn't in the generated list, just shuffle what we have.
           setPlaylist(shuffleArray(playlist));
        }
      } else {
        // For a general load, shuffle the generated playlist
        setPlaylist(shuffleArray(playlist));
      }
      setInitialHymnSet(true);
    }
  }, [playlist, searchParams, initialHymnSet]);

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
