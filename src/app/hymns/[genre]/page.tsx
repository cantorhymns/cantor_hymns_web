
import { GenreHymnList } from '@/components/genre-hymn-list';

// This is a Server Component that extracts the route parameter.
export default function GenrePage({ params }: { params: { genre: string } }) {
  const { genre: genreId } = params;

  // It passes the primitive genreId to the Client Component.
  // The Client Component is responsible for all data fetching.
  return <GenreHymnList genreId={genreId} />;
}
