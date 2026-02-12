'use client';
import React, { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useSearchData } from '@/lib/hooks/use-search-data';
import { useGenres } from '@/lib/hooks/useGenres';
import { useSearch } from '@/components/search-provider';
import { Music, Library, Loader2 } from 'lucide-react';
import { DialogTitle } from '@radix-ui/react-dialog';

export function HymnSearchDialog() {
    const router = useRouter();
    const { isOpen, setIsOpen } = useSearch();
    const { data: hymnSearchData, isLoading: hymnsLoading } = useSearchData();
    const { data: genres, isLoading: genresLoading } = useGenres();

    // Create a ref for the CommandList element
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isOpen, setIsOpen]);

    const onSelect = useCallback((path: string) => {
        router.push(path);
        setIsOpen(false);
    }, [router, setIsOpen]);
    
    const isLoading = hymnsLoading || genresLoading;

    // This function will be called whenever the user types in the search input.
    const handleSearchChange = () => {
        // We reset the scroll position of the list to the top.
        if (listRef.current) {
            listRef.current.scrollTop = 0;
        }
    };

    return (
        <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTitle className="sr-only">Search</DialogTitle>
            <CommandInput 
                placeholder="Search hymns, genres, cantors..." 
                onValueChange={handleSearchChange} // Call handler on input change
            />
            <CommandList ref={listRef}> {/* Attach the ref here */}
                {isLoading && (
                    <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Loading search data...</span>
                    </div>
                )}
                {!isLoading && !hymnSearchData && !genres && <CommandEmpty>No results found.</CommandEmpty>}
                
                {!isLoading && (
                     <>
                        <CommandEmpty>No results found.</CommandEmpty>
                        {hymnSearchData && (
                            <CommandGroup heading="Hymns">
                                {hymnSearchData.map((item) => (
                                    <CommandItem
                                        key={`hymn-${item.recordingId}`}
                                        value={`${item.hymnName} ${item.cantorName} ${item.genreNames.join(' ')} ${item.hymnDescription || ''}`}
                                        onSelect={() => onSelect(`/hymn/${item.hymnId}?recordingId=${item.recordingId}`)}
                                        className="cursor-pointer"
                                    >
                                        <Music className="mr-2 h-4 w-4" />
                                        <div className="flex-1 truncate">
                                            <p className="font-medium truncate">{item.hymnName}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {item.cantorName}
                                            </p>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {genres && (
                            <CommandGroup heading="Genres">
                                {genres.map((genre) => (
                                    <CommandItem
                                        key={`genre-${genre.id}`}
                                        value={genre.name}
                                        onSelect={() => onSelect(`/hymns/${genre.id}`)}
                                        className="cursor-pointer"
                                    >
                                        <Library className="mr-2 h-4 w-4" />
                                        <span>{genre.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                     </>
                )}
            </CommandList>
        </CommandDialog>
    );
}
