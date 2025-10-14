
'use client';
import { notFound } from 'next/navigation';
import { HymnPlayer } from '@/components/hymn-player';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useHymn } from '@/lib/hooks/useHymn';
import { useGenre } from '@/lib/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';

export default function HymnPage({ params }: { params: { hymnId: string } }) {
  const { data: hymn, isLoading: isHymnLoading } = useHymn(params);
  const { data: genre, isLoading: isGenreLoading } = useGenre({ genreId: hymn?.genreId });

  if (!isHymnLoading && !hymn) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      {isGenreLoading ? (
        <div className="mb-8">
            <Skeleton className="h-6 w-40" />
        </div>
      ) : genre && (
         <div className="mb-8">
            <Link
            href={`/hymns/${genre.id}`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
            >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to {genre.name}
            </Link>
         </div>
      )}
      {isHymnLoading || !hymn ? (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-10 w-[180px]" />
            </div>
            <Skeleton className="w-full h-20 rounded-lg" />
            <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
            </div>
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                 <div className="flex items-center gap-6 mt-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
        </div>
      ) : (
        <HymnPlayer hymn={hymn} />
      )}
    </div>
  );
}
