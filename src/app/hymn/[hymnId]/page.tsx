

import { HymnClientPage } from './hymn-client-page';
import { Suspense } from 'react';

export default function HymnPage({ params }: { params: { hymnId: string } }) {
  // This is a Server Component that simply passes the ID to the Client Component.
  // We wrap it in Suspense because HymnClientPage uses useSearchParams, which can suspend rendering.
  return (
    <Suspense>
      <HymnClientPage hymnId={params.hymnId} />
    </Suspense>
  );
}
