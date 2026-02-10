
'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronLeft, Music } from 'lucide-react';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import type { Genre, Hymn } from '@/lib/types';
import { useMemo } from 'react';

const HymnCard = ({ hymn, genreId }: { hymn: Hymn; genreId: string }) => {
  const learnCount = hymn.recordings?.filter(r => r.mode === 'learn').length || 0;
  const listenCount = hymn.recordings?.filter(r => r.mode === 'listen').length || 0;
  return (
    <Link href={`/hymn/${hymn.id}`} key={hymn.id} className="group">
      <Card className="h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-primary/50">
        <CardHeader className="flex-grow">
          <div className="mb-3">
            <Music className="h-8 w-8 text-primary/50" />
          </div>
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
  const { data: hymns, isLoading: areHymnsLoading } = useHymns(genreId);
  
  const isLoading = isGenreLoading || areHymnsLoading;
  const isValidIconUrl = genre?.icon && (genre.icon.startsWith('http://') || genre.icon.startsWith('https://'));

  const groupedHymns = useMemo(() => {
    if (!hymns) return null;
    if (!genre?.subGenres || genre.subGenres.length === 0) {
      // No subgenres, return a single group with all hymns
      return [{ name: null, hymns: hymns }];
    }

    // Initialize groups based on the genre's subGenres
    const groups: { name: string, hymns: Hymn[] }[] = genre.subGenres.map(sg => ({ name: sg, hymns: [] }));
    const subGenreSet = new Set(genre.subGenres);

    hymns.forEach(hymn => {
      let targetGroup;
      // Get the sub-genre for the current genre from the hymn's map
      const hymnSubGenreForCurrentGenre = hymn.subGenreId?.[genreId];
      
      // Check if the hymn has a valid sub-genre for this genre
      if (hymnSubGenreForCurrentGenre && subGenreSet.has(hymnSubGenreForCurrentGenre)) {
        targetGroup = groups.find(g => g.name === hymnSubGenreForCurrentGenre);
      }
      
      // If no valid subGenreId, or it doesn't match, add to the first sub-genre group
      if (!targetGroup) {
        targetGroup = groups[0];
      }
      
      targetGroup.hymns.push(hymn);
    });

    // Return only the groups that have hymns in them
    return groups.filter(g => g.hymns.length > 0);

  }, [genre, hymns, genreId]);


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
