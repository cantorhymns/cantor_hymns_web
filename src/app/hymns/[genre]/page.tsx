
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { getFirestoreAdmin } from '@/firebase/server';
import { GenreHymnList } from '@/components/genre-hymn-list';
import type { Genre } from '@/lib/types';

// This is a Server Component to handle data fetching and routing
export default async function GenrePage({ params }: { params: { genre: string } }) {
  const { genre: genreId } = params;

  // Use the server-side admin SDK to fetch data
  const firestore = getFirestoreAdmin();
  const genreRef = doc(firestore, 'genres', genreId);
  const genreSnap = await getDoc(genreRef);

  if (!genreSnap.exists()) {
    // If the genre doesn't exist in Firestore, show a 404 page.
    notFound();
  }

  const genreData = { id: genreSnap.id, ...genreSnap.data() } as Genre;

  // It passes the primitive genreId and the fetched genre data to the Client Component
  return <GenreHymnList genreId={genreId} initialGenre={genreData} />;
}
