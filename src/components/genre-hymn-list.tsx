'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import type { Hymn } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/components/search-provider';
import { useOrderedHymns } from '@/lib/hooks/useOrderedHymns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const HymnCard = ({ hymn, genreId }: { hymn: Hymn; genreId: string }) => {
  const learnCount = hymn.recordings?.filter(r => r.mode === 'learn').length || 0;
  const listenCount = hymn.recordings?.filter(r => r.mode === 'listen').length || 0;
  return (
    <Link href={`/hymn/${hymn.id}?genre=${genreId}`} key={hymn.id} className="group">
      <Card className="h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-primary/50">
        <CardHeader className="flex-grow">
          <CardTitle className="font-headline text-2xl text-primary">
            {hymn.name}
          </CardTitle>
          <CardDescription className="flex items-center gap-4 text-base">
            {learnCount > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>{learnCount} Learn</span>
              </div>
            )}
            {listenCount > 0 && (
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground/80">
                <span>{listenCount} Listen</span>
              </div>
            )}
            {(learnCount === 0 && listenCount === 0) && (
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground/80">
                <span>No active recordings</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
};


export function GenreHymnList({ genreId }: { genreId: string }) {
  const { data: genre, isLoading: isGenreLoading } = useGenre(genreId);
  const { groupedHymns, isLoading: areHymnsLoading } = useOrderedHymns(genreId);
  const { setIsOpen } = useSearch();
  
  const isLoading = isGenreLoading || areHymnsLoading;
  const isValidIconUrl = genre?.icon && (genre.icon.startsWith('http://') || genre.icon.startsWith('https://'));

  const useAccordion = groupedHymns && (groupedHymns.length > 1 || (groupedHymns.length === 1 && !!groupedHymns[0].name));

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Genres
        </Link>
        <div className="flex items-center gap-4">
           {isGenreLoading || !genre ? (
             <>
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div>
                    <Skeleton className="h-10 w-48" />
                </div>
             </>
           ) : (
            <>
                <div className="bg-primary/10 p-2 rounded-lg flex items-center justify-center">
                  {isValidIconUrl && (
                    <Image
                      src={genre.icon}
                      alt={`${genre.name} icon`}
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                  )}
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
                        {genre.name}
                    </h1>
                </div>
            </>
           )}
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto mb-12">
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setIsOpen(true)}>
            <SearchIcon className="mr-2 h-4 w-4" />
            Search hymns, genres, cantors...
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
            </kbd>
        </Button>
      </div>

      {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="h-full flex flex-col">
                    <CardHeader className="flex-grow">
                        <Skeleton className="h-8 w-8 mb-3" />
                        <Skeleton className="h-7 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                </Card>
            ))}
         </div>
      ) : useAccordion && groupedHymns ? (
        <Accordion
          type="multiple"
          defaultValue={groupedHymns.map(g => g.name!).filter(Boolean)}
          className="w-full space-y-8"
        >
          {groupedHymns.map((group) => (
            <AccordionItem key={group.name!} value={group.name!} className="border-b-0">
              <AccordionTrigger className="border-b-2 border-primary/20 pb-3 hover:no-underline">
                <h2 className="text-2xl font-headline font-bold text-primary/90 text-left">{group.name}</h2>
              </AccordionTrigger>
              <AccordionContent className="pt-6">
                {group.hymns.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {group.hymns.map((hymn) => (
                      <HymnCard key={hymn.id} hymn={hymn} genreId={genreId} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hymns in this section.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : groupedHymns && groupedHymns.length > 0 ? (
        <div className="space-y-12">
          {groupedHymns.map((group, index) => (
            <div key={group.name || index}>
              {group.name && (
                <h2 className="text-2xl font-headline font-bold text-primary/90 mb-6 border-b-2 border-primary/20 pb-3">{group.name}</h2>
              )}
              {group.hymns.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {group.hymns.map((hymn) => (
                        <HymnCard key={hymn.id} hymn={hymn} genreId={genreId} />
                    ))}
                  </div>
              ) : (
                <p className="text-muted-foreground">No hymns in this section.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No hymns available in this genre yet.</p>
        </div>
      )}
    </div>
  );
}
