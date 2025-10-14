
'use client';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, Music } from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import { useGenres } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { data: genres, isLoading } = useGenres();

  const renderIcon = (iconName: string) => {
    const Icon = (lucideIcons as any)[iconName] as lucideIcons.LucideIcon;
    if (!Icon) return <Music className="h-8 w-8 text-primary" />;
    return <Icon className="h-8 w-8 text-primary" />;
  };

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

        {genres && genres.map((genre) => (
          <Link href={`/hymns/${genre.id}`} key={genre.id} className="group">
            <Card className="h-full flex flex-col justify-between transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-primary/50">
              <CardHeader className="flex-row items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  {renderIcon(genre.icon as string)}
                </div>
                <div>
                  <CardTitle className="font-headline text-2xl text-primary">
                    {genre.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <div className="p-6 pt-0 flex justify-end items-center text-sm font-semibold text-primary/80 group-hover:text-primary">
                View Hymns
                <ArrowRight className="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
