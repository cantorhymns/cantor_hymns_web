
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { useGenres } from '@/lib/hooks/useGenres';
import { useHymns } from '@/lib/hooks/useHymns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import placeholderImages from '@/lib/placeholder-images.json';


export default function Home() {
  const { data: genres, isLoading: areGenresLoading } = useGenres();
  const { data: allHymns, isLoading: areHymnsLoading } = useHymns();

  const activeGenreIds = useMemo(() => {
    if (!allHymns) return new Set<string>();
    return new Set(allHymns.map(hymn => hymn.genreId));
  }, [allHymns]);

  const activeGenres = useMemo(() => {
    if (!genres) return [];
    return genres.filter(genre => activeGenreIds.has(genre.id));
  }, [genres, activeGenreIds]);

  const isLoading = areGenresLoading || areHymnsLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
          Hymn Genres
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="h-full flex flex-col justify-between">
            <CardHeader className="flex-row items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="w-2/3">
                <Skeleton className="h-7 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardHeader>
            <div className="p-6 pt-0 flex justify-end items-center">
              <Skeleton className="h-6 w-24" />
            </div>
          </Card>
        ))}

        {!isLoading && activeGenres.map((genre) => {
          const imageKey = genre.backgroundImageKey as keyof (typeof placeholderImages)['genre-backgrounds'] | undefined;
          const imageData = imageKey ? placeholderImages['genre-backgrounds'][imageKey as keyof typeof placeholderImages['genre-backgrounds']] : null;
          const isValidIconUrl = genre.icon && (genre.icon.startsWith('http://') || genre.icon.startsWith('https://'));
          
          return (
          <Link href={`/hymns/${genre.id}`} key={genre.id} className="group">
            <Card className="h-full flex flex-col justify-between transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 overflow-hidden relative">
              {imageData && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${imageData.url})` }}
                    data-ai-hint={imageData.hint}
                  />
                  <div className="absolute inset-0 bg-black/50" />
                </>
              )}
              <div className="relative h-full flex flex-col justify-between">
                <CardHeader className="flex-row items-center gap-4">
                  <div className={cn("p-2 rounded-lg flex items-center justify-center", imageData ? 'bg-white/10 backdrop-blur-sm' : 'bg-primary/10')}>
                    {isValidIconUrl && (
                      <Image
                        src={genre.icon}
                        alt={`${genre.name} icon`}
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                    )}
                  </div>
                  <div>
                    <CardTitle className={cn("font-headline text-2xl", imageData ? 'text-white' : 'text-primary')}>
                      {genre.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <div className={cn("p-6 pt-0 flex justify-end items-center text-sm font-semibold", imageData ? 'text-white/90 group-hover:text-white' : 'text-primary/80 group-hover:text-primary')}>
                  View Hymns
                  <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Card>
          </Link>
        )})}
      </div>
      {!isLoading && activeGenres.length === 0 && (
        <div className="text-center py-16 col-span-full">
          <p className="text-muted-foreground">No hymns with active recordings are available at this time.</p>
        </div>
      )}
    </div>
  );
}
