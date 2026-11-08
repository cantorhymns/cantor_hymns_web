'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { FirestoreRecording, FirestoreHymn, FirestoreCantor, FirestoreGenre } from '@/types/admin';
import defaultCatalog from '@/data/catalog.json';
import { parseGenreContent } from '@/lib/subgenre-utils';

// Client-only dynamic import with SSR disabled to prevent wavesurfer.js 500 crash on server pre-render
const WaveformEditor = dynamic(
  () => import('@/components/admin/markers/waveform-editor').then(mod => mod.WaveformEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 flex flex-col items-center justify-center p-6 text-center text-muted-foreground border rounded-xl bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading waveform studio...</p>
      </div>
    ),
  }
);
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Sliders,
  Search,
  Loader2,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Users,
  Lock,
} from 'lucide-react';
import { formatTime } from '@/components/admin/markers/audacity-converter';
import { formatCantorName } from '@/lib/utils';
import { useAdminAuth } from '@/context/admin-auth-context';
import { recordPendingChange } from '@/lib/pending-changes';
import { useHymnLock } from '@/lib/hooks/useHymnLock';

function MarkerStudioContent() {
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useAdminAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [recordings, setRecordings] = useState<FirestoreRecording[]>([]);
  const [cantors, setCantors] = useState<FirestoreCantor[]>([]);
  const [genres, setGenres] = useState<FirestoreGenre[]>([]);
  const [hymnsMap, setHymnsMap] = useState<Map<string, FirestoreHymn>>(new Map());

  // Selected state
  const [selectedCantorId, setSelectedCantorId] = useState<string>('all');
  const [markerFilter, setMarkerFilter] = useState<'all' | 'with-markers' | 'no-markers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);

  // Autocomplete search dropdown state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Audio stream & resolved recording assets state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [resolvedRecording, setResolvedRecording] = useState<FirestoreRecording | null>(null);
  const [resolvedHymn, setResolvedHymn] = useState<FirestoreHymn | undefined>(undefined);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load recordings, cantors, and hymns
  useEffect(() => {
    async function loadData() {
      if (!firestore) return;
      try {
        setIsLoading(true);

        const [cantorsSnap, hymnsSnap, recsSnap, genresSnap] = await Promise.all([
          getDocs(collection(firestore, 'cantors')),
          getDocs(collection(firestore, 'hymns')),
          getDocs(collection(firestore, 'recordings')),
          getDocs(collection(firestore, 'genres')),
        ]);

        const cList = cantorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreCantor));
        cList.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
        setCantors(cList);

        const fallbackGenresMap = new Map((defaultCatalog.genres as any[]).map(g => [g.id, g]));
        const gList = genresSnap.docs
          .filter(d => d.id !== 'app_settings' && d.id !== '__app_settings__')
          .map(d => {
          const data = d.data() as any;
          const fallback = fallbackGenresMap.get(d.id);
          return {
            id: d.id,
            ...data,
            rank: data.rank ?? fallback?.rank ?? 99,
            content: data.content || fallback?.content || '',
          } as FirestoreGenre;
        });

        const finalGenres = gList.length > 0 ? gList : (defaultCatalog.genres as any[]);
        finalGenres.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
        setGenres(finalGenres);

        const hMap = new Map<string, FirestoreHymn>();
        hymnsSnap.docs.forEach(d => {
          hMap.set(d.id, { id: d.id, ...d.data() } as FirestoreHymn);
        });
        setHymnsMap(hMap);

        const rList = recsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecording));
        rList.sort((a, b) => a.id.localeCompare(b.id));
        setRecordings(rList);

        // Pre-select from URL param (recordingId or hymnId) or first recording
        const paramRecId = searchParams.get('recordingId');
        const paramHymnId = searchParams.get('hymnId');

        if (paramRecId && rList.some(r => r.id === paramRecId)) {
          setSelectedRecordingId(paramRecId);
        } else if (paramHymnId) {
          const recForHymn = rList.find(r => r.hymnId === paramHymnId && (r.markers?.length || 0) > 0) ||
                             rList.find(r => r.hymnId === paramHymnId);
          if (recForHymn) {
            setSelectedRecordingId(recForHymn.id);
          } else if (rList.length > 0) {
            setSelectedRecordingId(rList[0].id);
          }
        } else if (rList.length > 0) {
          setSelectedRecordingId(rList[0].id);
        }
      } catch (err) {
        console.error('Failed to load marker studio data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [firestore, searchParams]);

  // React to URL search params changing dynamically
  useEffect(() => {
    if (recordings.length === 0) return;
    const recId = searchParams.get('recordingId');
    const hymnId = searchParams.get('hymnId');

    if (recId && recordings.some(r => r.id === recId)) {
      setSelectedRecordingId(recId);
    } else if (hymnId) {
      const rec = recordings.find(r => r.hymnId === hymnId && (r.markers?.length || 0) > 0) ||
                  recordings.find(r => r.hymnId === hymnId);
      if (rec) {
        setSelectedRecordingId(rec.id);
      }
    }
  }, [searchParams, recordings]);

  // Current active recording and hymn
  const currentRecording = useMemo(() => {
    return recordings.find(r => r.id === selectedRecordingId) || null;
  }, [recordings, selectedRecordingId]);

  const currentHymn = useMemo(() => {
    if (!currentRecording) return undefined;
    return hymnsMap.get(currentRecording.hymnId);
  }, [currentRecording, hymnsMap]);

  // Real-time collaborative edit lock
  const activeHymn = resolvedHymn || currentHymn;
  const {
    isLockedByOther,
    lockedBy,
    isLockOwner,
    overrideLock,
    activeLocks,
  } = useHymnLock(activeHymn?.id, activeHymn?.name);

  // Resolve audio download URL, markers, and lyrics mapping when current recording/hymn changes
  useEffect(() => {
    let isCancelled = false;

    async function resolveAssets() {
      if (!currentRecording || !firebaseApp) {
        setAudioUrl(null);
        setResolvedRecording(null);
        setResolvedHymn(undefined);
        return;
      }

      try {
        setIsLoadingAudio(true);
        setAudioError(null);

        const storage = getStorage(firebaseApp);

        // 1. Resolve Audio URL
        const fileRef = ref(storage, currentRecording.audioUrl);
        const downloadUrl = await getDownloadURL(fileRef);
        if (isCancelled) return;
        setAudioUrl(downloadUrl);

        // 2. Resolve Markers if missing from doc
        let finalMarkers: number[] =
          currentRecording.markers && currentRecording.markers.length > 0
            ? currentRecording.markers
            : (currentRecording as any).marks && (currentRecording as any).marks.length > 0
            ? (currentRecording as any).marks
            : [];

        if (finalMarkers.length === 0 && currentRecording.markersUrl) {
          try {
            const mRef = ref(storage, currentRecording.markersUrl);
            const mUrl = await getDownloadURL(mRef);
            const mRes = await fetch(mUrl);
            if (mRes.ok) {
              const text = await mRes.text();
              finalMarkers = text
                .split(/\r?\n/)
                .map(l => parseFloat(l.trim()))
                .filter(val => !isNaN(val) && val >= 0)
                .sort((a, b) => a - b);
            }
          } catch (mErr) {
            console.warn('Could not load markers from storage:', mErr);
          }
        }

        // 3. Resolve Lyrics Mapping if missing from doc
        let finalLyricsMapping: number[] =
          currentRecording.lyricsMapping && currentRecording.lyricsMapping.length > 0
            ? currentRecording.lyricsMapping
            : [];

        const mappingPath =
          currentRecording.lyricsMappingUrl ||
          (currentRecording.markersUrl
            ? currentRecording.markersUrl.replace('_markers.txt', '_lyrics_markers.txt')
            : undefined);

        if (finalLyricsMapping.length === 0 && mappingPath) {
          try {
            const lmRef = ref(storage, mappingPath);
            const lmUrl = await getDownloadURL(lmRef);
            const lmRes = await fetch(lmUrl);
            if (lmRes.ok) {
              const text = await lmRes.text();
              finalLyricsMapping = text
                .split(/\r?\n/)
                .filter(l => l.trim().length > 0)
                .map(l => {
                  const num = parseInt(l.trim(), 10);
                  return isNaN(num) ? -1 : num;
                });
            }
          } catch (lmErr) {
            // Silently ignore if mapping file does not exist in storage
          }
        }

        const mergedRec: FirestoreRecording = {
          ...currentRecording,
          markers: finalMarkers,
          lyricsMapping: finalLyricsMapping,
        };

        if (!isCancelled) {
          setResolvedRecording(mergedRec);
        }

        // 4. Resolve Hymn Lyrics if missing from doc
        if (currentHymn) {
          let coptic = currentHymn.lyrics?.coptic || '';
          let english = currentHymn.lyrics?.english || '';
          let arabic = currentHymn.lyrics?.arabic || '';

          const cPath = (currentHymn as any).lyricsCoptic;
          const ePath = (currentHymn as any).lyricsEnglish;
          const aPath = (currentHymn as any).lyricsArabic;

          if (!coptic && cPath) {
            try {
              const cRef = ref(storage, cPath);
              const cUrl = await getDownloadURL(cRef);
              const cRes = await fetch(cUrl);
              if (cRes.ok) coptic = (await cRes.text()).trim();
            } catch (_) {}
          }
          if (!english && ePath) {
            try {
              const eRef = ref(storage, ePath);
              const eUrl = await getDownloadURL(eRef);
              const eRes = await fetch(eUrl);
              if (eRes.ok) english = (await eRes.text()).trim();
            } catch (_) {}
          }
          if (!arabic && aPath) {
            try {
              const aRef = ref(storage, aPath);
              const aUrl = await getDownloadURL(aRef);
              const aRes = await fetch(aUrl);
              if (aRes.ok) arabic = (await aRes.text()).trim();
            } catch (_) {}
          }

          const mergedHymn: FirestoreHymn = {
            ...currentHymn,
            lyrics: { coptic, english, arabic },
          };
          if (!isCancelled) {
            setResolvedHymn(mergedHymn);
          }
        } else {
          if (!isCancelled) {
            setResolvedHymn(undefined);
          }
        }
      } catch (err: any) {
        console.error('Failed to resolve audio/marker assets:', err);
        if (!isCancelled) {
          setAudioError(err.message || 'Could not load audio track from storage.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAudio(false);
        }
      }
    }

    resolveAssets();

    return () => {
      isCancelled = true;
    };
  }, [currentRecording, currentHymn, firebaseApp]);

  // Map of cantors for display name lookups
  const cantorsMap = useMemo(() => new Map(cantors.map(c => [c.id, c])), [cantors]);

  // All recordings for current hymn (allows switching between cantors)
  const hymnRecordings = useMemo(() => {
    if (!currentRecording) return [];
    return recordings.filter(r => r.hymnId === currentRecording.hymnId);
  }, [recordings, currentRecording]);

  // Select recording handler (syncs URL & closes search)
  const handleSelectRecording = useCallback((recId: string) => {
    setSelectedRecordingId(recId);
    setIsSearchOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
    const url = new URL(window.location.href);
    url.searchParams.set('recordingId', recId);
    url.searchParams.delete('hymnId');
    window.history.replaceState(null, '', url.toString());
  }, []);

  // Filtered recordings list for selector & interactive search
  const filteredRecordings = useMemo(() => {
    return recordings.filter(r => {
      if (selectedCantorId !== 'all' && r.cantorId !== selectedCantorId) {
        return false;
      }
      if (markerFilter === 'with-markers' && (!r.markers || r.markers.length === 0)) {
        return false;
      }
      if (markerFilter === 'no-markers' && r.markers && r.markers.length > 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const hymn = hymnsMap.get(r.hymnId);
        const hymnName = (hymn?.name || '').toLowerCase();
        const cantorName = formatCantorName(r.cantorId, cantorsMap).toLowerCase();
        const recId = r.id.toLowerCase();
        const hymnId = r.hymnId.toLowerCase();
        if (
          !hymnName.includes(query) &&
          !cantorName.includes(query) &&
          !recId.includes(query) &&
          !hymnId.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [recordings, selectedCantorId, markerFilter, searchQuery, hymnsMap, cantorsMap]);

  // Construct ordered hymns list based on seasons rank, subgenres, and hymns within
  const orderedHymns = useMemo(() => {
    const list: {
      hymnId: string;
      hymnName: string;
      seasonId: string;
      seasonName: string;
      subgenreName: string;
      seasonRank: number;
    }[] = [];

    const seenHymnIds = new Set<string>();

    // 1. Process each genre (season) in liturgical rank order (Kiahk #1, Nativity #2, Lent #3...)
    const sortedGenres = [...genres].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

    sortedGenres.forEach(genre => {
      const sections = parseGenreContent(genre.content);
      sections.forEach(sec => {
        const subgenreName = sec.name || 'General';
        sec.hymnIds.forEach(hId => {
          const trimmedId = hId.trim();
          if (trimmedId && !seenHymnIds.has(trimmedId)) {
            seenHymnIds.add(trimmedId);
            const hymn = hymnsMap.get(trimmedId);
            list.push({
              hymnId: trimmedId,
              hymnName: hymn?.name || trimmedId,
              seasonId: genre.id,
              seasonName: genre.name || genre.id,
              subgenreName,
              seasonRank: genre.rank ?? 99,
            });
          }
        });
      });
    });

    // 2. Append any remaining hymns in hymnsMap not found in any genre content
    hymnsMap.forEach((hymn, hId) => {
      if (!seenHymnIds.has(hId)) {
        seenHymnIds.add(hId);
        list.push({
          hymnId: hId,
          hymnName: hymn.name || hId,
          seasonId: hymn.genreIds?.[0] || 'general',
          seasonName: 'Other',
          subgenreName: 'General',
          seasonRank: 999,
        });
      }
    });

    return list;
  }, [genres, hymnsMap]);

  // Candidate hymns respecting active filters (cantor and marker filters)
  const candidateHymns = useMemo(() => {
    return orderedHymns.filter(item => {
      return recordings.some(r => {
        if (r.hymnId !== item.hymnId) return false;
        if (selectedCantorId !== 'all' && r.cantorId !== selectedCantorId) return false;
        if (markerFilter === 'with-markers' && (!r.markers || r.markers.length === 0)) return false;
        if (markerFilter === 'no-markers' && r.markers && r.markers.length > 0) return false;
        return true;
      });
    });
  }, [orderedHymns, recordings, selectedCantorId, markerFilter]);

  // Current index within candidate hymns
  const currentHymnIndex = useMemo(() => {
    if (!currentRecording) return -1;
    return candidateHymns.findIndex(h => h.hymnId === currentRecording.hymnId);
  }, [candidateHymns, currentRecording]);

  const currentHymnContext = useMemo(() => {
    if (currentHymnIndex < 0 || !candidateHymns[currentHymnIndex]) return null;
    return {
      ...candidateHymns[currentHymnIndex],
      index: currentHymnIndex,
      total: candidateHymns.length,
    };
  }, [candidateHymns, currentHymnIndex]);

  const prevHymnInfo = currentHymnIndex > 0 ? candidateHymns[currentHymnIndex - 1] : null;
  const nextHymnInfo =
    currentHymnIndex >= 0 && currentHymnIndex < candidateHymns.length - 1
      ? candidateHymns[currentHymnIndex + 1]
      : null;

  // Navigate to target hymn in liturgical order
  const navigateToHymn = useCallback(
    (targetHymnId: string) => {
      const candidateRecs = recordings.filter(r => {
        if (r.hymnId !== targetHymnId) return false;
        if (selectedCantorId !== 'all' && r.cantorId !== selectedCantorId) return false;
        if (markerFilter === 'with-markers' && (!r.markers || r.markers.length === 0)) return false;
        if (markerFilter === 'no-markers' && r.markers && r.markers.length > 0) return false;
        return true;
      });

      if (candidateRecs.length === 0) {
        const fallbackRec = recordings.find(r => r.hymnId === targetHymnId);
        if (fallbackRec) {
          handleSelectRecording(fallbackRec.id);
        }
        return;
      }

      // Retain the current cantor if they have a recording for this hymn
      const sameCantorRec = candidateRecs.find(r => r.cantorId === currentRecording?.cantorId);
      const targetRec = sameCantorRec || candidateRecs[0];

      handleSelectRecording(targetRec.id);
    },
    [recordings, selectedCantorId, markerFilter, currentRecording, handleSelectRecording]
  );

  const goToPrevHymn = useCallback(() => {
    if (prevHymnInfo) {
      navigateToHymn(prevHymnInfo.hymnId);
    }
  }, [prevHymnInfo, navigateToHymn]);

  const goToNextHymn = useCallback(() => {
    if (nextHymnInfo) {
      navigateToHymn(nextHymnInfo.hymnId);
    }
  }, [nextHymnInfo, navigateToHymn]);

  // Keyboard shortcut listener: [ for prev hymn, ] for next hymn
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '[' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        goToPrevHymn();
      } else if (e.key === ']' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        goToNextHymn();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevHymn, goToNextHymn]);

  // Reset highlight index when query or results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, filteredRecordings.length]);

  // Keyboard navigation for search results
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsSearchOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1 < filteredRecordings.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : Math.max(0, filteredRecordings.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredRecordings[highlightedIndex]) {
        handleSelectRecording(filteredRecordings[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  // Save updated markers and lyrics mapping to Cloud Firestore & Firebase Storage
  const handleSaveMarkers = async (markers: number[], lyricsMapping: number[]) => {
    if (!firestore || !currentRecording) return;

    try {
      setIsSaving(true);

      const updatedMode = markers.length > 0 ? 'learn' : (currentRecording.mode || 'learn');

      const recRef = doc(firestore, 'recordings', currentRecording.id);
      await updateDoc(recRef, {
        markers,
        lyricsMapping,
        mode: updatedMode,
        audioLength: markers.length > 0 ? Math.max(markers[markers.length - 1], currentRecording.audioLength) : currentRecording.audioLength,
        updatedAt: serverTimestamp(),
      });

      // Also persist markers.txt and lyrics_markers.txt directly to Firebase Storage for mobile app and CDN compatibility
      if (firebaseApp) {
        try {
          const storage = getStorage(firebaseApp);
          const markersPath = currentRecording.markersUrl || `markers/${currentRecording.cantorId}/${currentRecording.id}_markers.txt`;
          const markersText = markers.map(m => m.toFixed(2)).join('\n') + '\n';
          const markersBlob = new Blob([markersText], { type: 'text/plain; charset=utf-8' });
          await uploadBytes(ref(storage, markersPath), markersBlob, { contentType: 'text/plain; charset=utf-8' });

          if (lyricsMapping.length > 0) {
            const mappingPath = currentRecording.lyricsMappingUrl || markersPath.replace('_markers.txt', '_lyrics_markers.txt');
            const mappingBlob = new Blob([lyricsMapping.join('\n') + '\n'], { type: 'text/plain; charset=utf-8' });
            await uploadBytes(ref(storage, mappingPath), mappingBlob, { contentType: 'text/plain; charset=utf-8' });
          }
        } catch (storageErr) {
          console.warn('Could not upload markers text file to storage:', storageErr);
        }
      }

      // Update local recordings state
      setRecordings(prev =>
        prev.map(r =>
          r.id === currentRecording.id
            ? { ...r, markers, lyricsMapping, mode: updatedMode }
            : r
        )
      );
      setResolvedRecording(prev =>
        prev && prev.id === currentRecording.id
          ? { ...prev, markers, lyricsMapping, mode: updatedMode }
          : prev
      );

      // Record pending change for staging review and 1-click undo
      const cantorName = formatCantorName(currentRecording.cantorId, cantorsMap);
      await recordPendingChange(firestore, {
        entityType: 'markers',
        entityId: currentRecording.id,
        entityName: `${currentHymn?.name || currentRecording.id} (${cantorName})`,
        action: 'update',
        summary: `Updated waveform markers (${markers.length} markers, ${updatedMode} mode)`,
        details: `Previous: ${currentRecording.markers?.length || 0} markers`,
        previousSnapshot: {
          markers: currentRecording.markers || [],
          lyricsMapping: currentRecording.lyricsMapping || [],
          mode: currentRecording.mode || 'learn',
          audioLength: currentRecording.audioLength || 0,
        },
        newSnapshot: {
          markers,
          lyricsMapping,
          mode: updatedMode,
          audioLength: markers.length > 0 ? Math.max(markers[markers.length - 1], currentRecording.audioLength) : currentRecording.audioLength,
        },
        userEmail: user?.email || 'admin',
      });

      toast({
        title: 'Markers Saved to Cloud',
        description: `Successfully updated ${markers.length} markers for ${currentHymn?.name || currentRecording.id} (Mode: Learn).`,
      });
    } catch (err: any) {
      console.error('Failed to save markers:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update markers in Firestore.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save updated hymn lyrics to Cloud Firestore
  const handleSaveLyrics = async (
    hymnId: string,
    lyrics: { coptic: string; english: string; arabic: string }
  ) => {
    if (!firestore) return;

    try {
      const hymnRef = doc(firestore, 'hymns', hymnId);
      await updateDoc(hymnRef, {
        lyrics,
        updatedAt: serverTimestamp(),
      });

      // Update hymnsMap in local state so WaveformEditor immediately reflects new lyrics
      const prevHymn = hymnsMap.get(hymnId) || currentHymn;
      setHymnsMap(prev => {
        const next = new Map(prev);
        const existing = next.get(hymnId);
        if (existing) {
          next.set(hymnId, {
            ...existing,
            lyrics,
          });
        }
        return next;
      });
      setResolvedHymn(prev => (prev && prev.id === hymnId ? { ...prev, lyrics } : prev));

      // Record pending change for staging review and 1-click undo
      await recordPendingChange(firestore, {
        entityType: 'lyrics',
        entityId: hymnId,
        entityName: prevHymn?.name || hymnId,
        action: 'update',
        summary: `Updated lyrics text (Coptic, English, Arabic)`,
        previousSnapshot: {
          lyrics: prevHymn?.lyrics || { coptic: '', english: '', arabic: '' },
        },
        newSnapshot: {
          lyrics,
        },
        userEmail: user?.email || 'admin',
      });

      toast({
        title: 'Lyrics Saved to Cloud',
        description: `Successfully updated Coptic, English, and Arabic verses for ${hymnsMap.get(hymnId)?.name || hymnId}.`,
      });
    } catch (err: any) {
      console.error('Failed to save lyrics:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update lyrics in Firestore.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading Waveform Marker Studio...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Studio Header & Shortcuts Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            <span>Waveform Marker Studio</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive millisecond audio marker alignment tool for Coptic hymns
          </p>
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border">
          <div><kbd className="px-1 py-0.5 rounded bg-background border font-mono">Space</kbd> Play/Pause</div>
          <div><kbd className="px-1 py-0.5 rounded bg-background border font-mono">M</kbd> Drop Marker</div>
          <div><kbd className="px-1 py-0.5 rounded bg-background border font-mono">←/→</kbd> Nudge 50ms</div>
          <div><kbd className="px-1 py-0.5 rounded bg-background border font-mono">L</kbd> Loop Section</div>
          <div><kbd className="px-1 py-0.5 rounded bg-background border font-mono">[/]</kbd> Prev/Next Hymn</div>
          <div><kbd className="px-1 py-0.5 rounded bg-background border font-mono">Del</kbd> Delete</div>
        </div>
      </div>

      {/* Track Selection Bar */}
      <Card className="bg-card shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          {/* Cantor Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={selectedCantorId}
              onValueChange={val => setSelectedCantorId(val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Cantors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Cantors</SelectItem>
                {cantors.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {formatCantorName(c.id, cantorsMap)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Markers Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={markerFilter}
              onValueChange={(val: any) => setMarkerFilter(val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Recordings</SelectItem>
                <SelectItem value="with-markers" className="text-xs">With Markers Only</SelectItem>
                <SelectItem value="no-markers" className="text-xs">No Markers Yet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interactive Search Input & Autocomplete Dropdown List */}
          <div className="relative flex-1 min-w-[240px]" ref={searchContainerRef}>
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search hymns by English, Coptic, Arabic, or Cantor..."
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="h-9 pl-8 pr-8 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHighlightedIndex(0);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Live Autocomplete Results List */}
            {isSearchOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] max-w-xl z-50 rounded-xl border bg-popover/95 backdrop-blur-md shadow-2xl p-1 text-popover-foreground animate-in fade-in-0 zoom-in-95">
                <div className="px-3 py-2 flex items-center justify-between border-b text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {searchQuery ? `Matching Recordings (${filteredRecordings.length})` : `Recordings List (${filteredRecordings.length})`}
                  </span>
                  <span className="text-[10px]">
                    <kbd className="px-1 py-0.5 rounded bg-muted">↑</kbd><kbd className="px-1 py-0.5 rounded bg-muted ml-0.5">↓</kbd> navigate &bull; <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> select
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y py-1">
                  {filteredRecordings.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">No hymns or recordings found</p>
                      <p className="text-[11px] opacity-70">Try adjusting your search query or filters.</p>
                    </div>
                  ) : (
                    filteredRecordings.map((rec, idx) => {
                      const h = hymnsMap.get(rec.hymnId);
                      const markerCount = rec.markers?.length || 0;
                      const isSelected = rec.id === selectedRecordingId;
                      const isHighlighted = idx === highlightedIndex;
                      const cName = formatCantorName(rec.cantorId, cantorsMap);

                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectRecording(rec.id)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full text-left p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/15 border-l-4 border-primary font-medium'
                              : isHighlighted
                              ? 'bg-muted/80'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {h?.name || rec.hymnId}
                              </span>
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  markerCount > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                }`}
                                title={markerCount > 0 ? `${markerCount} markers available` : 'No markers'}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground/80">{cName}</span>
                              {rec.audioLength ? (
                                <span className="font-mono text-[10px]">
                                  &bull; {formatTime(rec.audioLength)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {(() => {
                              const lock = activeLocks.get(rec.hymnId);
                              if (lock && lock.userEmail !== user?.email) {
                                return (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 whitespace-nowrap">
                                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                                    <span>{lock.userName}</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {markerCount > 0 ? (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                {markerCount} mk
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 px-1 whitespace-nowrap">
                                No markers
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recording Selector Dropdown */}
          <div className="w-full sm:w-80">
            <Select
              value={selectedRecordingId || ''}
              onValueChange={handleSelectRecording}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select a Recording" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredRecordings.map(rec => {
                  const h = hymnsMap.get(rec.hymnId);
                  const markerCount = rec.markers?.length || 0;
                  const cName = formatCantorName(rec.cantorId, cantorsMap);
                  return (
                    <SelectItem key={rec.id} value={rec.id} className="text-xs">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <span className="font-medium truncate">
                            {h?.name || rec.hymnId}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            ({cName})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(() => {
                            const lock = activeLocks.get(rec.hymnId);
                            if (lock && lock.userEmail !== user?.email) {
                              return (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-0.5 whitespace-nowrap">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>{lock.userName}</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {markerCount > 0 ? (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {markerCount} markers
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60">
                              No markers
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Collaborative Concurrency Lock Warning Banner */}
      {isLockedByOther && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Read-Only Mode &bull; Active Editing Lock</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">Locked</span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                <strong>{lockedBy?.userName || lockedBy?.userEmail}</strong> is currently editing "{resolvedHymn?.name || currentHymn?.name}". To protect marker integrity and prevent overwriting, editing controls are locked.
              </p>
            </div>
          </div>
          {user && (user.email === 'cantorhymns@gmail.com' || user.email === 'andrewekladious@gmail.com') && (
            <Button
              size="sm"
              variant="outline"
              onClick={overrideLock}
              className="border-amber-600 text-amber-800 hover:bg-amber-600 hover:text-white dark:border-amber-400 dark:text-amber-200 text-xs shrink-0 self-end sm:self-center font-medium"
            >
              Take Over Lock (Owner Override)
            </Button>
          )}
        </div>
      )}

      {/* Editor View */}
      {isLoadingAudio ? (
        <div className="h-80 flex flex-col items-center justify-center p-6 text-center text-muted-foreground border rounded-xl bg-card">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium">Downloading audio track from Firebase Storage CDN...</p>
        </div>
      ) : audioError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <h3 className="font-semibold text-sm">Failed to Load Audio Track</h3>
          <p className="text-xs text-muted-foreground">{audioError}</p>
        </div>
      ) : resolvedRecording && audioUrl ? (
        <WaveformEditor
          key={resolvedRecording.id}
          recording={resolvedRecording}
          hymn={resolvedHymn || currentHymn}
          audioSrc={audioUrl}
          onSave={handleSaveMarkers}
          onSaveLyrics={handleSaveLyrics}
          isSaving={isSaving}
          hymnRecordings={hymnRecordings}
          cantorsMap={cantorsMap}
          onSelectRecording={handleSelectRecording}
          onPrevHymn={goToPrevHymn}
          onNextHymn={goToNextHymn}
          prevHymnTitle={prevHymnInfo ? `${prevHymnInfo.hymnName} (${prevHymnInfo.seasonName})` : null}
          nextHymnTitle={nextHymnInfo ? `${nextHymnInfo.hymnName} (${nextHymnInfo.seasonName})` : null}
          hymnPositionText={
            currentHymnContext
              ? `${currentHymnContext.seasonName} › ${currentHymnContext.subgenreName} (${currentHymnContext.index + 1} of ${currentHymnContext.total})`
              : null
          }
          isReadOnly={isLockedByOther}
          lockedByMessage={lockedBy ? `Currently locked by ${lockedBy.userName || lockedBy.userEmail}` : null}
        />
      ) : (
        <div className="p-12 text-center text-muted-foreground border rounded-xl bg-card">
          <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <h3 className="font-semibold text-base text-foreground">No Recording Selected</h3>
          <p className="text-xs mt-1">Select an audio recording from the dropdown above to begin editing markers.</p>
        </div>
      )}
    </div>
  );
}

export default function AdminMarkersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MarkerStudioContent />
    </Suspense>
  );
}
