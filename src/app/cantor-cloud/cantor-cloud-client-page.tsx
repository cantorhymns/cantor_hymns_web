
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenres } from '@/lib/hooks/useGenres';
import { useCantors } from '@/lib/hooks/useCantors';
import { Hymn, Cantor, Genre, Recording } from '@/lib/types';
import { HymnPlayer } from '@/components/hymn-player';
import { Playlist } from '@/components/playlist';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Shuffle, SkipBack, SkipForward, ListMusic, X, Rewind, FastForward } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  const [genreFilter, setGenreFilter] = useState<string>(searchParams.get('genreId') || 'all');
  const [cantorFilter, setCantorFilter] = useState<string>('all');
  const [isShuffled, setIsShuffled] = useState<boolean>(true);
  const [playlist, setPlaylist] = useState<Hymn[]>([]);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Hymn[]>([]);
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
    allHymns.forEach(hymn => {
        (hymn.recordings || []).forEach(rec => {
            cantorIds.add(rec.cantorId);
        });
    });
    return cantorIds;
  }, [allHymns]);

  // Filter cantors for the dropdown
  const filteredCantors = useMemo(() => {
    if (!allCantors) return [];
    return allCantors.filter(c => 
        c.cantorCloudActive && activeCantorIdsWithHymns.has(c.id)
    );
  }, [allCantors, activeCantorIdsWithHymns]);

  // Populate cantor details into each hymn's recordings
  const hymnsWithPopulatedCantors = useMemo(() => {
    if (!allHymns || !allCantors) return null;
    const cantorsMap = new Map(allCantors.map(c => [c.id, c]));
    return allHymns.map(hymn => ({
      ...hymn,
      recordings: (hymn.recordings || []).map(rec => ({
        ...rec,
        cantor: cantorsMap.get(rec.cantorId)
      })).sort((a, b) => {
          if (a.mode === 'learn' && b.mode !== 'learn') return -1;
          if (a.mode !== 'learn' && b.mode === 'learn') return 1;
          const rankA = a.cantor?.rank ?? 99;
          const rankB = b.cantor?.rank ?? 99;
          return rankA - rankB;
      })
    }));
  }, [allHymns, allCantors]);

  // Build playlist based on filters
  useEffect(() => {
    if (!hymnsWithPopulatedCantors) return;

    let filteredHymns = [...hymnsWithPopulatedCantors];

    if (genreFilter && genreFilter !== 'all') {
      filteredHymns = filteredHymns.filter(h => h.genreId.includes(genreFilter));
    }
    if (cantorFilter && cantorFilter !== 'all') {
      filteredHymns = filteredHymns.filter(h => 
        (h.recordings || []).some(r => r.cantorId === cantorFilter)
      );
    }
    
    setPlaylist(filteredHymns);
    // When filters change, reset the shuffle and current index
    setCurrentIndex(0);
    setInitialHymnSet(false); // Allow initial hymn to be set again

  }, [hymnsWithPopulatedCantors, genreFilter, cantorFilter]);

  // Handle shuffling
  useEffect(() => {
    if (isShuffled) {
      setShuffledPlaylist(shuffleArray(playlist));
    } else {
      setShuffledPlaylist([]);
    }
  }, [playlist, isShuffled]);
  
  // Set initial hymn from URL params once playlist is ready
  useEffect(() => {
    if (playlist.length > 0 && !initialHymnSet) {
        const startHymnId = searchParams.get('hymnId');
        if (startHymnId) {
            const startIndex = playlist.findIndex(h => h.id === startHymnId);
            if (startIndex !== -1) {
                setCurrentIndex(startIndex);
                setAutoplay(true);
            }
        }
        setInitialHymnSet(true);
    }
  }, [playlist, searchParams, initialHymnSet]);

  const currentPlaylist = isShuffled ? shuffledPlaylist : playlist;
  const currentHymn = currentPlaylist?.[currentIndex];

  const handleNext = useCallback(() => {
    setAutoplay(true);
    setCurrentIndex(prevIndex => (prevIndex + 1) % currentPlaylist.length);
  }, [currentPlaylist.length]);

  const handlePrevious = () => {
    setAutoplay(true);
    setCurrentIndex(prevIndex => (prevIndex - 1 + currentPlaylist.length) % currentPlaylist.length);
  };

  const handleSelectTrack = (index: number) => {
    setAutoplay(true);
    setCurrentIndex(index);
  };

  const isLoading = hymnsLoading || genresLoading || cantorsLoading;
  const showPlayer = !isLoading && currentHymn;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 w-full">
                <Select onValueChange={setGenreFilter} value={genreFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Genres" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Genres</SelectItem>
                        {allGenres?.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select onValueChange={setCantorFilter} value={cantorFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Cantors" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Cantors</SelectItem>
                        {filteredCantors?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
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
                  onNextHymn={handleNext}
                  onPreviousHymn={handlePrevious}
                />
                 <Playlist playlist={currentPlaylist} currentIndex={currentIndex} onSelectTrack={handleSelectTrack} />
            </div>
        ) : (
            <div className="w-full max-w-3xl mx-auto">
                <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
                    <ListMusic className="h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-6 text-2xl font-semibold">No Hymns to Play</h2>
                    <p className="mt-2 text-muted-foreground">
                        {isLoading ? "Loading hymns..." : "Try adjusting your filters or there might be no hymns available."}
                    </p>
                    {(genreFilter !== 'all' || cantorFilter !== 'all') && (
                        <Button variant="outline" className="mt-4" onClick={() => { setGenreFilter('all'); setCantorFilter('all'); }}>
                           <X className="mr-2 h-4 w-4" /> Clear Filters
                        </Button>
                    )}
                </Card>
            </div>
        )}
    </div>
  );
}
