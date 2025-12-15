
// This is a Server Component that handles the route.
import { HymnClientPage } from './hymn-client-page';

export default function HymnPage({ params }: { params: { hymnId: string } }) {
  const { hymnId } = params;

  // It passes the primitive hymnId to the Client Component
  // which is responsible for all data fetching and rendering.
  return <HymnClientPage hymnId={hymnId} />;
}
