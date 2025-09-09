import Link from 'next/link';
import { getHymnsByGenre, getGenreById } from '@/lib/hymns-data';
import { notFound } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ChevronLeft, Music, ArrowRight } from 'lucide-react';

export default function GenrePage({ params }: { params: { genre: string } }) {
  const genre = getGenreById(params.genre);
  const hymns = getHymnsByGenre(params.genre);

  if (!genre || hymns.length === 0) {
    notFound();
  }

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
          <div className="bg-primary/10 p-3 rounded-lg">
             <genre.icon className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
              {genre.name}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {genre.description}
            </p>
          </div>
        </div>
      </div>

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
                  {hymn.recordings.length} recordings available
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
    </div>
  );
}
