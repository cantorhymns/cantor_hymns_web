
'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth, useUser } from '@/firebase/auth/use-user';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Skeleton } from './ui/skeleton';

/**
 * A client component that ensures a user is authenticated before rendering its children.
 * If the user is not authenticated, it initiates an anonymous sign-in flow.
 * It displays a loading state while checking authentication status.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    // When the component mounts, if the user is not loading and is not logged in,
    // and we have a valid auth instance, initiate anonymous sign-in.
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
    // The dependency array ensures this effect runs when loading state or user status changes.
  }, [isUserLoading, user, auth]);

  // While checking the auth state, show a full-page loading skeleton.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
            <div className="text-center mb-12">
                <Skeleton className="h-12 w-64 mx-auto mb-4" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
            </div>
        </div>
      </div>
    );
  }

  // Once the user is authenticated (or the anonymous sign-in completes),
  // render the actual application content.
  return <>{children}</>;
}
