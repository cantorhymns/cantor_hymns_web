'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardTitle,
} from '@/components/ui/card';
import { useGenres } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';
import { useSearch } from '@/components/search-provider';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon } from 'lucide-react';


export default function Home() {
  const { data: genres, isLoading: areGenresLoading } = useGenres();
  const { setIsOpen } = useSearch();

  const { firebaseApp } = useFirebase();
  const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [
    firebaseApp,
  ]);
  const [backgroundUrls, setBackgroundUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!storage || !genres || genres.length === 0) {
      return;
    }

    const fetchUrls = async () => {
      const urls: Record<string, string> = {};
      const promises = genres.map(async (genre) => {
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
    };

    fetchUrls();
  }, [genres, storage]);

  const isLoading = areGenresLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="w-full max-w-xl mx-auto mb-12">
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setIsOpen(true)}>
            <SearchIcon className="mr-2 h-4 w-4" />
            Search hymns, genres, cantors...
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
            </kbd>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col justify-center items-center text-center p-6 min-h-[320px]">
            <Skeleton className="h-10 w-10 rounded-lg mb-4" />
            <Skeleton className="h-7 w-2/3" />
          </Card>
        ))}

        {!isLoading && genres && genres.map((genre) => {
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
      {!isLoading && genres && genres.length === 0 && (
        <div className="text-center py-16 col-span-full">
          <p className="text-muted-foreground">No genres are available at this time.</p>
        </div>
      )}
    </div>
  );
}
