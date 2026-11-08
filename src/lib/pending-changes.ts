import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { PendingChange, ChangeEntityType } from '@/types/admin';

export interface RecordChangeParams {
  entityType: ChangeEntityType;
  entityId: string;
  entityName: string;
  action: 'update' | 'create' | 'reorder';
  summary: string;
  details?: string;
  previousSnapshot: any;
  newSnapshot: any;
  userEmail: string;
}

const LOCAL_STORAGE_KEY = 'cantorhymns_pending_changes';

export function getLocalPendingChanges(): PendingChange[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(c => !c.published && !c.reverted);
  } catch {
    return [];
  }
}

export function saveLocalPendingChanges(changes: PendingChange[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(changes));
  } catch (err) {
    console.warn('Could not save pending changes to localStorage:', err);
  }
}

export function dispatchPendingChangesUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cantorhymns_pending_changes_updated'));
}

/**
 * Record a pending change whenever an admin saves data in the portal.
 * Instantly records to localStorage (so UI is immediately updated even if offline or rules block),
 * and asynchronously saves to Cloud Firestore under a deterministic document ID.
 */
export async function recordPendingChange(
  firestore: Firestore | null,
  params: RecordChangeParams
): Promise<string> {
  const deterministicId = `${params.entityType}__${params.entityId}`;

  // 1. Instantly record to localStorage
  let baselineSnapshot = params.previousSnapshot;
  const localList = getLocalPendingChanges();
  const existingLocalIdx = localList.findIndex(
    c =>
      (c.id === deterministicId ||
        (c.entityType === params.entityType && c.entityId === params.entityId)) &&
      !c.published &&
      !c.reverted
  );

  if (existingLocalIdx >= 0 && localList[existingLocalIdx].previousSnapshot !== undefined) {
    baselineSnapshot = localList[existingLocalIdx].previousSnapshot;
  }

  const changeRecord: PendingChange = {
    id: deterministicId,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    action: params.action,
    summary: params.summary,
    details: params.details || '',
    previousSnapshot: baselineSnapshot ?? null,
    newSnapshot: params.newSnapshot ?? null,
    userEmail: params.userEmail,
    timestamp: new Date().toISOString(),
    published: false,
    reverted: false,
  };

  if (existingLocalIdx >= 0) {
    localList[existingLocalIdx] = changeRecord;
  } else {
    localList.unshift(changeRecord);
  }
  saveLocalPendingChanges(localList);
  dispatchPendingChangesUpdated();

  // 2. Also persist to Cloud Firestore if connected
  if (firestore) {
    try {
      const docRef = doc(firestore, 'pending_changes', deterministicId);
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as PendingChange;
        if (
          existingData.previousSnapshot !== undefined &&
          !existingData.published &&
          !existingData.reverted
        ) {
          changeRecord.previousSnapshot = existingData.previousSnapshot;
        }
      }
      await setDoc(docRef, changeRecord, { merge: true });
    } catch (err) {
      console.warn('Could not mirror pending change to Firestore (local copy is preserved):', err);
    }
  }

  return deterministicId;
}

/**
 * Atomically revert a pending change back to its `previousSnapshot` in Firestore
 * and re-sync any relevant storage assets (like markers.txt).
 */
export async function revertPendingChange(
  firestore: Firestore,
  firebaseApp: any,
  changeId: string,
  userEmail: string
): Promise<{ success: boolean; entityName: string; error?: string }> {
  try {
    // 1. Check local storage first
    const localList = getLocalPendingChanges();
    const localChange = localList.find(c => c.id === changeId);

    let change: PendingChange | null = localChange || null;

    // 2. If not found locally or to ensure latest snapshot, check Firestore
    const changeRef = doc(firestore, 'pending_changes', changeId);
    if (!change) {
      try {
        const snap = await getDoc(changeRef);
        if (snap.exists()) {
          change = snap.data() as PendingChange;
        }
      } catch (_) {}
    }

    if (!change) {
      return { success: false, entityName: '', error: 'Change record not found' };
    }

    const { entityType, entityId, entityName, action, previousSnapshot } = change;

    // Restore based on entity type in Firestore
    if (entityType === 'markers') {
      const recRef = doc(firestore, 'recordings', entityId);
      const prevMarkers: number[] = Array.isArray(previousSnapshot?.markers)
        ? previousSnapshot.markers
        : [];
      const prevLyricsMapping: number[] = Array.isArray(previousSnapshot?.lyricsMapping)
        ? previousSnapshot.lyricsMapping
        : [];
      const prevMode = previousSnapshot?.mode || (prevMarkers.length > 0 ? 'learn' : 'listen');
      const prevAudioLength = previousSnapshot?.audioLength || 0;

      await updateDoc(recRef, {
        markers: prevMarkers,
        lyricsMapping: prevLyricsMapping,
        mode: prevMode,
        audioLength: prevAudioLength,
        updatedAt: serverTimestamp(),
      });

      // Restore storage files if firebaseApp is available
      if (firebaseApp) {
        try {
          const storage = getStorage(firebaseApp);
          const recSnap = await getDoc(recRef);
          const recData = recSnap.data() as any;
          const markersPath =
            recData?.markersUrl || `markers/${recData?.cantorId}/${entityId}_markers.txt`;

          if (prevMarkers.length > 0) {
            const markersText = prevMarkers.map(m => Number(m).toFixed(2)).join('\n') + '\n';
            const markersBlob = new Blob([markersText], { type: 'text/plain; charset=utf-8' });
            await uploadBytes(ref(storage, markersPath), markersBlob, {
              contentType: 'text/plain; charset=utf-8',
            });
          }

          if (prevLyricsMapping.length > 0) {
            const mappingPath =
              recData?.lyricsMappingUrl || markersPath.replace('_markers.txt', '_lyrics_markers.txt');
            const mappingBlob = new Blob([prevLyricsMapping.join('\n') + '\n'], {
              type: 'text/plain; charset=utf-8',
            });
            await uploadBytes(ref(storage, mappingPath), mappingBlob, {
              contentType: 'text/plain; charset=utf-8',
            });
          }
        } catch (storageErr) {
          console.warn('Could not re-sync reverted marker files to storage:', storageErr);
        }
      }
    } else if (entityType === 'lyrics') {
      const hymnRef = doc(firestore, 'hymns', entityId);
      await updateDoc(hymnRef, {
        lyrics: previousSnapshot?.lyrics || { coptic: '', english: '', arabic: '' },
        updatedAt: serverTimestamp(),
      });
    } else if (entityType === 'hymn') {
      const hymnRef = doc(firestore, 'hymns', entityId);
      if (previousSnapshot) {
        await updateDoc(hymnRef, {
          ...previousSnapshot,
          updatedAt: serverTimestamp(),
        });
      }
    } else if (entityType === 'season') {
      if (action === 'reorder' && Array.isArray(previousSnapshot)) {
        await Promise.all(
          previousSnapshot.map((s: any) =>
            updateDoc(doc(firestore, 'genres', s.id), {
              rank: s.rank,
              updatedAt: serverTimestamp(),
            })
          )
        );
      } else if (previousSnapshot) {
        await updateDoc(doc(firestore, 'genres', entityId), {
          ...previousSnapshot,
          updatedAt: serverTimestamp(),
        });
      }
    } else if (entityType === 'cantor') {
      if (action === 'reorder' && Array.isArray(previousSnapshot)) {
        await Promise.all(
          previousSnapshot.map((c: any) =>
            updateDoc(doc(firestore, 'cantors', c.id), {
              rank: c.rank,
              updatedAt: serverTimestamp(),
            })
          )
        );
      } else if (previousSnapshot) {
        await updateDoc(doc(firestore, 'cantors', entityId), {
          ...previousSnapshot,
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Mark reverted in localStorage
    const updatedLocal = getLocalPendingChanges().filter(c => c.id !== changeId);
    saveLocalPendingChanges(updatedLocal);
    dispatchPendingChangesUpdated();

    // Mark reverted in Firestore if accessible
    try {
      await updateDoc(changeRef, {
        reverted: true,
        revertedAt: new Date().toISOString(),
        revertedBy: userEmail,
      });
    } catch (_) {}

    return { success: true, entityName };
  } catch (err: any) {
    console.error('Failed to revert pending change:', err);
    return { success: false, entityName: '', error: err.message || 'Failed to revert' };
  }
}

/**
 * Mark all active pending changes as published after compileAndPublishCatalog succeeds.
 */
export async function markAllChangesAsPublished(
  firestore: Firestore,
  userEmail?: string
): Promise<number> {
  // Clear local storage
  saveLocalPendingChanges([]);
  dispatchPendingChangesUpdated();

  // Try updating Firestore
  try {
    const changesCol = collection(firestore, 'pending_changes');
    const q = query(changesCol, where('published', '==', false), where('reverted', '==', false));
    const snap = await getDocs(q);

    if (snap.empty) return 0;

    const publishedAt = new Date().toISOString();
    await Promise.all(
      snap.docs.map(d =>
        updateDoc(d.ref, {
          published: true,
          publishedAt,
          publishedBy: userEmail || 'system',
        })
      )
    );

    return snap.docs.length;
  } catch (err) {
    console.warn('Could not mark Firestore pending changes as published (local copy cleared):', err);
    return 0;
  }
}
