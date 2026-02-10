

import { HymnClientPage } from './hymn-client-page';

export default function HymnPage({ params }: { params: { hymnId: string } }) {
  // This is a Server Component that simply passes the ID to the Client Component.
  return <HymnClientPage hymnId={params.hymnId} />;
}
