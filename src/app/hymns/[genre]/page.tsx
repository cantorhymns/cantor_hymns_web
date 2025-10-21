
'use client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronLeft, Music, ArrowRight } from 'lucide-react';
import { useHymns } from '@/lib/hooks/useHymns';
import { useGenre } from '@/lib/hooks/useGenres';
import * as lucideIcons from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function GenrePage({ params }: { params: { genre: string } }) {
  const { data: genre, isLoading: isGenreLoading } = useGenre(params);
  const { data: hymns, isLoading: areHymnsLoading } = useHymns(params);

  if (!isGenreLoading && !genre) {
    notFound();
  }

  const renderIcon = (iconName: string) => {
    const Icon = (lucideIcons as any)[iconName] as lucideIcons.LucideIcon;
    if (!Icon) return <Music className="h-10 w-10 text-primary" />;
    return <Icon className="h-10 w-10 text-primary" />;
  };

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
          {isGenreLoading ? (
            <>
              <Skeleton className="h-[68px] w-[68px] rounded-lg" />
              <div>
                <Skeleton className="h-12 w-48 mb-2" />
                <Skeleton className="h-6 w-72" />
              </div>
            </>
          ) : genre && (
            <>
              <div className="bg-primary/10 p-3 rounded-lg">
                {renderIcon(genre.icon as string)}
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

      {areHymnsLoading ? (
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
          {hymns.map((hymn) => (
            <Link href={`/hymn/${hymn.id}`} key={hymn.id} className="group">
              <Card className="h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader className="flex-grow">
                  <div className="mb-3">
                    <Music className="h-8 w-8 text-primary/50" />
                  </div>
                  <CardTitle className="font-headline text-2xl text-primary">
                    {hymn.name}
                  </CardTitle>
                  <CardDescription>
                    {hymn.recordings?.length || 0} recordings available
                  </CardDescription>
                </CardHeader>
                 <div className="p-6 pt-0 flex justify-end items-center text-sm font-semibold text-primary/80 group-hover:text-primary">
                  Practice Hymn
                  <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
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
