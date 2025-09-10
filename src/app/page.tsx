import Link from 'next/link';
import { genres } from '@/lib/hymns-data';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
          Hymn Genres
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {genres.map((genre) => (
          <Link href={`/hymns/${genre.id}`} key={genre.id} className="group">
            <Card className="h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 group-hover:border-primary/50">
              <CardHeader className="flex-row items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <genre.icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-headline text-2xl text-primary">
                    {genre.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardDescription className="p-6 pt-0 flex-grow">
                {genre.description}
              </CardDescription>
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
