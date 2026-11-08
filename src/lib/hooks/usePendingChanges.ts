'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { PendingChange } from '@/types/admin';
import {
  revertPendingChange,
  getLocalPendingChanges,
  saveLocalPendingChanges,
} from '@/lib/pending-changes';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/hooks/use-toast';

export function usePendingChanges() {
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useAdminAuth();
  const { toast } = useToast();

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() =>
    getLocalPendingChanges()
  );
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  // Sync with localStorage & custom window events
  const refreshFromLocal = useCallback(() => {
    setPendingChanges(getLocalPendingChanges());
  }, []);

  useEffect(() => {
    refreshFromLocal();

    window.addEventListener('cantorhymns_pending_changes_updated', refreshFromLocal);
    window.addEventListener('storage', refreshFromLocal);

    return () => {
      window.removeEventListener('cantorhymns_pending_changes_updated', refreshFromLocal);
      window.removeEventListener('storage', refreshFromLocal);
    };
  }, [refreshFromLocal]);

  // Sync with Cloud Firestore
  useEffect(() => {
    if (!firestore) return;

    try {
      const col = collection(firestore, 'pending_changes');
      const q = query(col, where('published', '==', false), where('reverted', '==', false));

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const cloudItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as PendingChange[];

          // Merge cloud items with local items
          const localItems = getLocalPendingChanges();
          const itemMap = new Map<string, PendingChange>();

          // Cloud items take precedence
          cloudItems.forEach(c => itemMap.set(c.id, c));
          // Keep any local changes that haven't hit the cloud yet
          localItems.forEach(c => {
            if (!itemMap.has(c.id)) {
              itemMap.set(c.id, c);
            }
          });

          const merged = Array.from(itemMap.values());
          merged.sort((a, b) => {
            const tA = new Date(a.timestamp || 0).getTime();
            const tB = new Date(b.timestamp || 0).getTime();
            return tB - tA;
          });

          saveLocalPendingChanges(merged);
          setPendingChanges(merged);
        },
        error => {
          // Cloud Firestore rules might not be deployed yet; keep using localStorage smoothly
          console.debug('Pending changes cloud sync fallback to local storage:', error.message);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.debug('Could not attach pending changes listener:', err);
    }
  }, [firestore]);

  const undoChange = useCallback(
    async (changeId: string): Promise<boolean> => {
      if (!firestore) return false;
      setUndoingId(changeId);

      try {
        const result = await revertPendingChange(
          firestore,
          firebaseApp,
          changeId,
          user?.email || 'admin'
        );

        if (result.success) {
          toast({
            title: 'Change Undone',
            description: `Successfully restored previous state for ${result.entityName || 'item'}.`,
          });
          refreshFromLocal();
          return true;
        } else {
          toast({
            title: 'Undo Failed',
            description: result.error || 'Could not revert this change.',
            variant: 'destructive',
          });
          return false;
        }
      } catch (err: any) {
        toast({
          title: 'Undo Failed',
          description: err.message || 'An error occurred during revert.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setUndoingId(null);
      }
    },
    [firestore, firebaseApp, user, toast, refreshFromLocal]
  );

  return {
    pendingChanges,
    count: pendingChanges.length,
    loading,
    undoChange,
    undoingId,
  };
}
