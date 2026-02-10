
import { Suspense } from 'react';
import { CantorCloudClientPage } from './cantor-cloud-client-page';
import { Skeleton } from '@/components/ui/skeleton';

function CantorCloudLoading() {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 w-full">
                <Skeleton className="h-10 w-full md:w-48" />
                <Skeleton className="h-10 w-full md:w-48" />
            </div>
            <Skeleton className="h-10 w-full md:w-32" />
        </div>
        
        <Skeleton className="h-[300px] w-full max-w-3xl mx-auto" />
        
        <div className="w-full max-w-3xl mx-auto mt-8 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

export default function CantorCloudPage() {
  return (
    <Suspense fallback={<CantorCloudLoading />}>
      <CantorCloudClientPage />
    </Suspense>
  );
}
