
'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronLeft, Music, ArrowRight } from 'lucide-react';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import type { Genre } from '@/lib/types';

export function GenreHymnList({ genreId }: { genreId: string }) {
  const { data: genre, isLoading: isGenreLoading } = useGenre(genreId);
  const { data: hymns, isLoading: areHymnsLoading } = useHymns(genreId);
  
  const isLoading = isGenreLoading || areHymnsLoading;

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
                <div className="w-2/3">
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-6 w-full max-w-sm" />
                </div>
             </>
           ) : (
            <>
                <div className="bg-primary/10 p-2 rounded-lg flex items-center justify-center">
                  {genre.icon && (
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
                <p className="mt-2 text-lg text-muted-foreground">
                    {genre.description}
                </p>
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
                    <div className="p-6 pt-0 flex justify-end items-center">
                        <Skeleton className="h-6 w-24" />
                    </div>
                </Card>
            ))}
         </div>
      ) : hymns && hymns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hymns.map((hymn) => {
            const learnCount = hymn.recordings?.filter(r => r.active).length || 0;
            const listenCount = hymn.recordings?.filter(r => !r.active).length || 0;
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
                                <span>No recordings</span>
                            </div>
                        )}
                    </CardDescription>
                    </CardHeader>
                    <div className="p-6 pt-0 flex justify-end items-center text-sm font-semibold text-primary/80 group-hover:text-primary">
                    Practice Hymn
                    <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                </Card>
                </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No hymns available in this genre yet.</p>
        </div>
      )}
    </div>
  );
}
