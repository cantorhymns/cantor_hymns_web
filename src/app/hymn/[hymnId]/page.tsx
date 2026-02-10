

import { redirect } from 'next/navigation';

export default function HymnPage({ params }: { params: { hymnId: string } }) {
  const { hymnId } = params;

  // Redirect to the CantorCloud player page for this hymn.
  // We don't know the genre context here, so we just pass the hymnId.
  redirect(`/cantor-cloud?hymnId=${hymnId}`);
}
