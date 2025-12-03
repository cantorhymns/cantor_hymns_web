
import { GenreHymnList } from '@/components/genre-hymn-list';

// This is a Server Component. Its only job is to extract the route
// parameter and pass it to the Client Component.
export default function GenrePage({ params }: { params: { genre: string } }) {
  const { genre: genreId } = params;

  // It passes the primitive genreId to the Client Component.
  // The client component will handle all data fetching.
  return <GenreHymnList genreId={genreId} />;
}
