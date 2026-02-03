'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardTitle,
} from '@/components/ui/card';
import { useGenres } from '@/lib/hooks/useGenres';
import { useHymns } from '@/lib/hooks/useHymns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';


export default function Home() {
  const { data: genres, isLoading: areGenresLoading } = useGenres();
  const { data: allHymns, isLoading: areHymnsLoading } = useHymns();

  const { firebaseApp } = useFirebase();
  const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [
    firebaseApp,
  ]);
  const [backgroundUrls, setBackgroundUrls] = useState<Record<string, string>>({});
  const [areUrlsLoading, setAreUrlsLoading] = useState(true);

  const activeGenreIds = useMemo(() => {
    if (!allHymns) return new Set<string>();
    return new Set(allHymns.map(hymn => hymn.genreId));
  }, [allHymns]);

  const activeGenres = useMemo(() => {
    if (!genres) return [];
    return genres.filter(genre => activeGenreIds.has(genre.id));
  }, [genres, activeGenreIds]);

  useEffect(() => {
    if (!storage || activeGenres.length === 0) {
      if (!areGenresLoading) setAreUrlsLoading(false);
      return;
    }

    const fetchUrls = async () => {
      setAreUrlsLoading(true);
      const urls: Record<string, string> = {};
      const promises = activeGenres.map(async (genre) => {
        if (genre.backgroundUrl) {
          try {
            const storageRef = ref(storage, genre.backgroundUrl);
            const url = await getDownloadURL(storageRef);
            urls[genre.id] = url;
          } catch (error) {
            console.error(`Failed to get background URL for ${genre.name}:`, error);
            // If a URL fails, it just won't be in the map, so no background will be shown.
          }
        }
      });
      await Promise.all(promises);
      setBackgroundUrls(urls);
      setAreUrlsLoading(false);
    };

    fetchUrls();
  }, [activeGenres, storage, areGenresLoading]);


  const isLoading = areGenresLoading || areHymnsLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
          Hymn Genres
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col justify-center items-center text-center p-6 min-h-[320px]">
            <Skeleton className="h-10 w-10 rounded-lg mb-4" />
            <Skeleton className="h-7 w-2/3" />
          </Card>
        ))}

        {!isLoading && activeGenres.map((genre) => {
          const backgroundUrl = backgroundUrls[genre.id];
          const isValidIconUrl = genre.icon && (genre.icon.startsWith('http://') || genre.icon.startsWith('https://'));
          
          return (
          <Link href={`/hymns/${genre.id}`} key={genre.id} className="group">
            <Card className="h-full flex flex-col justify-center items-center p-6 text-center transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 overflow-hidden relative min-h-[320px]">
              {backgroundUrl && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${backgroundUrl})` }}
                  />
                  <div className="absolute inset-0 bg-black/50" />
                </>
              )}
              <div className="relative">
                <div className={cn("p-2 rounded-lg inline-block", backgroundUrl ? 'bg-white/10 backdrop-blur-sm' : 'bg-primary/10')}>
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
                <CardTitle className={cn("font-headline text-2xl pt-4", backgroundUrl ? 'text-white' : 'text-primary')}>
                    {genre.name}
                </CardTitle>
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
