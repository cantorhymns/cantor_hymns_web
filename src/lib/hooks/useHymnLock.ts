'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  collection,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAdminAuth } from '@/context/admin-auth-context';
import { HymnLockInfo } from '@/types/admin';

const LEASE_DURATION_MS = 45000; // 45 seconds lease
const HEARTBEAT_INTERVAL_MS = 15000; // Heartbeat ping every 15s

export function useHymnLock(
  hymnId?: string | null,
  hymnTitle?: string | null,
  enabled: boolean = true
) {
  const { firestore } = useFirebase();
  const { user, isOwner } = useAdminAuth();

  const [currentLock, setCurrentLock] = useState<HymnLockInfo | null>(null);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [isLockOwner, setIsLockOwner] = useState(false);
  const [activeLocks, setActiveLocks] = useState<Map<string, HymnLockInfo>>(new Map());

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockRefPathRef = useRef<string | null>(null);
  const isLockOwnerRef = useRef(false);

  useEffect(() => {
    isLockOwnerRef.current = isLockOwner;
  }, [isLockOwner]);

  // 1. Subscribe to all active locks in the system (for badges in hymn selector/table)
  useEffect(() => {
    if (!firestore || !enabled) return;

    const unsubAll = onSnapshot(
      collection(firestore, 'active_locks'),
      snapshot => {
        const now = Date.now();
        const locksMap = new Map<string, HymnLockInfo>();
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() as HymnLockInfo;
          if (
            data &&
            now - (data.lastHeartbeat || 0) < (data.leaseDurationMs || LEASE_DURATION_MS)
          ) {
            locksMap.set(data.hymnId, data);
          }
        });
        setActiveLocks(locksMap);
      },
      err => {
        console.warn('Error subscribing to active locks:', err);
      }
    );

    return () => unsubAll();
  }, [firestore, enabled]);

  // Helper to release the currently held lock
  const releaseLock = useCallback(async () => {
    if (!firestore || !lockRefPathRef.current || !isLockOwnerRef.current) return;
    const pathToRelease = lockRefPathRef.current;
    try {
      await deleteDoc(doc(firestore, pathToRelease));
    } catch (err) {
      console.warn('Failed to release hymn lock:', err);
    } finally {
      setIsLockOwner(false);
      isLockOwnerRef.current = false;
      lockRefPathRef.current = null;
    }
  }, [firestore]);

  // Helper to acquire lock
  const acquireLock = useCallback(
    async (targetHymnId: string, targetHymnTitle: string) => {
      if (!firestore || !user) return;
      const docPath = `active_locks/hymn_${targetHymnId}`;
      const now = Date.now();
      const payload: HymnLockInfo = {
        hymnId: targetHymnId,
        hymnTitle: targetHymnTitle || targetHymnId,
        userId: user.uid,
        userEmail: user.email || 'unknown',
        userName: user.displayName || user.email?.split('@')[0] || 'Editor',
        acquiredAt: now,
        lastHeartbeat: now,
        leaseDurationMs: LEASE_DURATION_MS,
      };

      try {
        await setDoc(doc(firestore, docPath), payload, { merge: true });
        lockRefPathRef.current = docPath;
        setIsLockOwner(true);
        isLockOwnerRef.current = true;
        setIsLockedByOther(false);
        setCurrentLock(payload);
      } catch (err) {
        console.warn('Failed to acquire lock:', err);
      }
    },
    [firestore, user]
  );

  // Helper for Project Owners to forcibly take over a lock
  const overrideLock = useCallback(async () => {
    if (!hymnId || !user || !isOwner) return;
    await acquireLock(hymnId, hymnTitle || hymnId);
  }, [hymnId, hymnTitle, user, isOwner, acquireLock]);

  // 2. Manage single-hymn lock lifecycle
  useEffect(() => {
    if (!firestore || !user || !enabled || !hymnId) {
      setIsLockedByOther(false);
      setIsLockOwner(false);
      setCurrentLock(null);
      return;
    }

    const docPath = `active_locks/hymn_${hymnId}`;
    const lockDoc = doc(firestore, docPath);

    const unsub = onSnapshot(
      lockDoc,
      async snapshot => {
        const now = Date.now();
        if (!snapshot.exists()) {
          // No lock exists, acquire it immediately!
          await acquireLock(hymnId, hymnTitle || hymnId);
          return;
        }

        const data = snapshot.data() as HymnLockInfo;
        const isExpired =
          now - (data.lastHeartbeat || 0) >= (data.leaseDurationMs || LEASE_DURATION_MS);
        const isSelf = data.userId === user.uid || data.userEmail === user.email;

        if (isSelf) {
          // We own this lock
          setIsLockedByOther(false);
          setIsLockOwner(true);
          isLockOwnerRef.current = true;
          lockRefPathRef.current = docPath;
          setCurrentLock(data);
        } else if (isExpired) {
          // Lock expired from another user, take over
          await acquireLock(hymnId, hymnTitle || hymnId);
        } else {
          // Actively locked by another user!
          setIsLockedByOther(true);
          setIsLockOwner(false);
          isLockOwnerRef.current = false;
          setCurrentLock(data);
        }
      },
      err => {
        console.warn(`Error on hymn lock snapshot for ${hymnId}:`, err);
      }
    );

    // Heartbeat loop when we own the lock
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(async () => {
      if (isLockOwnerRef.current && lockRefPathRef.current && firestore) {
        try {
          await updateDoc(doc(firestore, lockRefPathRef.current), {
            lastHeartbeat: Date.now(),
          });
        } catch (err) {
          console.warn('Heartbeat ping failed:', err);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on tab close
    const handleBeforeUnload = () => {
      if (isLockOwnerRef.current && lockRefPathRef.current && firestore) {
        try {
          deleteDoc(doc(firestore, lockRefPathRef.current));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      unsub();
      // Clean up lock if we were the owner
      if (isLockOwnerRef.current && lockRefPathRef.current && firestore) {
        try {
          deleteDoc(doc(firestore, lockRefPathRef.current));
        } catch {}
      }
    };
  }, [firestore, user, enabled, hymnId, hymnTitle, acquireLock]);

  return {
    isLockedByOther,
    isLockOwner,
    currentLock,
    lockedBy: currentLock,
    overrideLock,
    releaseLock,
    activeLocks,
  };
}
