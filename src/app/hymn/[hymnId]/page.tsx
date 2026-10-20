import { HymnClientPage } from './hymn-client-page';
import { Suspense } from 'react';

export default async function HymnPage({
  params,
}: {
  params: Promise<{ hymnId: string }>;
}) {
  const { hymnId } = await params;

  return (
    <Suspense>
      <HymnClientPage hymnId={hymnId} />
    </Suspense>
  );
}
