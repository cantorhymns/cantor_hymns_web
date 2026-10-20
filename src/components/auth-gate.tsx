'use client';

import { type ReactNode } from 'react';

/**
 * A pass-through client component.
 * Firestore dependence is removed, so pages render immediately with zero auth-gate blocking.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
