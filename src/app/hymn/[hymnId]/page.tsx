
import { HymnClientPage } from '@/components/hymn-client-page';

// This is now a Server Component
export default function HymnPage({ params }: { params: { hymnId: string } }) {
    const { hymnId } = params;

    // It passes the primitive hymnId to the Client Component
    return <HymnClientPage hymnId={hymnId} />;
}
