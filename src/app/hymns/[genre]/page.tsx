
import { GenreHymnList } from '@/components/genre-hymn-list';

// This is now a Server Component
export default function GenrePage({ params }: { params: { genre: string } }) {
  const { genre: genreId } = params;

  // It passes the primitive genreId to the Client Component
  return <GenreHymnList genreId={genreId} />;
}
