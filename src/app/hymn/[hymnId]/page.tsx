import { getHymnById, getGenreById } from '@/lib/hymns-data';
import { notFound } from 'next/navigation';
import { HymnPlayer } from '@/components/hymn-player';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export async function generateMetadata({ params }: { params: { hymnId: string } }) {
  const hymn = getHymnById(params.hymnId);

  if (!hymn) {
    return {
      title: 'Hymn Not Found',
    };
  }

  return {
    title: `${hymn.name} | Cantor`,
    description: `Practice the hymn ${hymn.name}.`,
  };
}


export default function HymnPage({ params }: { params: { hymnId: string } }) {
  const hymn = getHymnById(params.hymnId);

  if (!hymn) {
    notFound();
  }
  
  const genre = getGenreById(hymn.genre);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      {genre && (
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
      <HymnPlayer hymn={hymn} />
    </div>
  );
}
