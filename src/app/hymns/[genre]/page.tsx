import { GenreHymnList } from '@/components/genre-hymn-list';

export default async function GenrePage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre: genreId } = await params;

  return <GenreHymnList genreId={genreId} />;
}
