'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { FirestoreHymn, FirestoreGenre, FirestoreRecording } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Music2,
  Search,
  Plus,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ExternalLink,
  ChevronRight,
  BookOpen,
  FolderTree,
  Sparkles,
  X,
} from 'lucide-react';
import { formatCantorName } from '@/lib/utils';
import defaultCatalog from '@/data/catalog.json';
import {
  getAvailableSubgenres,
  getHymnSubgenre,
  setHymnSubgenre,
  removeHymnFromGenre,
} from '@/lib/subgenre-utils';

function AdminHymnsContent() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [hymns, setHymns] = useState<FirestoreHymn[]>([]);
  const [genres, setGenres] = useState<FirestoreGenre[]>([]);
  const [recordings, setRecordings] = useState<FirestoreRecording[]>([]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has-markers' | 'complete' | 'missing-lyrics'>('all');

  // Currently editing hymn
  const [selectedHymnId, setSelectedHymnId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenreIds, setEditGenreIds] = useState<string[]>([]);
  const [editSubgenres, setEditSubgenres] = useState<Record<string, string>>({});
  const [addingCustomSubgenreFor, setAddingCustomSubgenreFor] = useState<string | null>(null);
  const [customSubgenreInput, setCustomSubgenreInput] = useState('');
  const [editCoptic, setEditCoptic] = useState('');
  const [editEnglish, setEditEnglish] = useState('');
  const [editArabic, setEditArabic] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New hymn modal
  const [isNewHymnOpen, setIsNewHymnOpen] = useState(false);
  const [newHymnId, setNewHymnId] = useState('');
  const [newHymnName, setNewHymnName] = useState('');
  const [newHymnGenre, setNewHymnGenre] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectHymn = (h: FirestoreHymn, availableGenres: FirestoreGenre[] = genres) => {
    setSelectedHymnId(h.id);
    setEditName(h.name || '');
    setEditDescription(h.description || '');
    const gIds = h.genreIds || (h as any).genreId || [];
    setEditGenreIds(gIds);
    setEditCoptic(h.lyrics?.coptic || '');
    setEditEnglish(h.lyrics?.english || '');
    setEditArabic(h.lyrics?.arabic || '');

    const subMap: Record<string, string> = {};
    gIds.forEach(gid => {
      const g = availableGenres.find(x => x.id === gid);
      const sub = h.subGenreId?.[gid] || getHymnSubgenre(g?.content, h.id) || '';
      if (sub) {
        subMap[gid] = sub;
      }
    });
    setEditSubgenres(subMap);
    setAddingCustomSubgenreFor(null);
    setCustomSubgenreInput('');
  };

  // Load all hymns, genres, recordings
  useEffect(() => {
    async function loadData() {
      if (!firestore) return;
      try {
        setIsLoading(true);
        const [hymnsSnap, genresSnap, recsSnap] = await Promise.all([
          getDocs(collection(firestore, 'hymns')),
          getDocs(collection(firestore, 'genres')),
          getDocs(collection(firestore, 'recordings')),
        ]);

        const fallbackGenresMap = new Map((defaultCatalog.genres as any[]).map(g => [g.id, g]));
        const gList = genresSnap.docs.map(d => {
          const data = d.data() as any;
          const fallback = fallbackGenresMap.get(d.id);
          return {
            id: d.id,
            ...data,
            content: data.content || fallback?.content || '',
          } as FirestoreGenre;
        });
        gList.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
        setGenres(gList);

        const hList = hymnsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreHymn));
        hList.sort((a, b) => a.name.localeCompare(b.name));
        setHymns(hList);

        const rList = recsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecording));
        setRecordings(rList);

        // Pre-select from URL param or first hymn
        const paramHymnId = searchParams.get('hymnId');
        const found = paramHymnId ? hList.find(h => h.id === paramHymnId) : null;
        if (found) {
          selectHymn(found, gList);
        } else if (hList.length > 0 && !selectedHymnId) {
          selectHymn(hList[0], gList);
        }
      } catch (err) {
        console.error('Failed to load hymns:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [firestore, searchParams]);

  // React to URL search param changing dynamically
  useEffect(() => {
    if (hymns.length === 0) return;
    const paramHymnId = searchParams.get('hymnId');
    if (paramHymnId && paramHymnId !== selectedHymnId) {
      const found = hymns.find(h => h.id === paramHymnId);
      if (found) {
        selectHymn(found, genres);
      }
    }
  }, [searchParams, hymns, selectedHymnId, genres]);

  const currentHymn = useMemo(() => {
    return hymns.find(h => h.id === selectedHymnId) || null;
  }, [hymns, selectedHymnId]);

  const hymnRecordings = useMemo(() => {
    if (!selectedHymnId) return [];
    return recordings.filter(r => r.hymnId === selectedHymnId);
  }, [recordings, selectedHymnId]);

  // Filtered hymns list
  const filteredHymns = useMemo(() => {
    return hymns.filter(h => {
      if (selectedGenreId !== 'all') {
        const ids = h.genreIds || (h as any).genreId || [];
        if (!ids.includes(selectedGenreId)) return false;
      }

      if (statusFilter === 'has-markers') {
        const hasMarkers = recordings.some(r => r.hymnId === h.id && (r.markers?.length || 0) > 0);
        if (!hasMarkers) return false;
      } else if (statusFilter === 'complete') {
        const hasCoptic = Boolean(h.lyrics?.coptic?.trim());
        const hasEnglish = Boolean(h.lyrics?.english?.trim());
        const hasArabic = Boolean(h.lyrics?.arabic?.trim());
        const isComplete = hasCoptic && hasEnglish && hasArabic;
        if (!isComplete) return false;
      } else if (statusFilter === 'missing-lyrics') {
        const hasCoptic = Boolean(h.lyrics?.coptic?.trim());
        const hasEnglish = Boolean(h.lyrics?.english?.trim());
        const hasArabic = Boolean(h.lyrics?.arabic?.trim());
        const isComplete = hasCoptic && hasEnglish && hasArabic;
        if (isComplete) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (h.name || '').toLowerCase().includes(q);
        const matchesId = h.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      return true;
    });
  }, [hymns, selectedGenreId, statusFilter, searchQuery, recordings]);

  // Line count calculations
  const copticLines = useMemo(
    () => editCoptic.split(/\r?\n/).filter(l => l.trim().length > 0).length,
    [editCoptic]
  );
  const englishLines = useMemo(
    () => editEnglish.split(/\r?\n/).filter(l => l.trim().length > 0).length,
    [editEnglish]
  );
  const arabicLines = useMemo(
    () => editArabic.split(/\r?\n/).filter(l => l.trim().length > 0).length,
    [editArabic]
  );

  const linesMatch =
    (copticLines === englishLines && (arabicLines === 0 || arabicLines === englishLines)) ||
    (copticLines === 0 && englishLines === 0);

  // Save hymn changes
  const handleSaveHymn = async () => {
    if (!firestore || !selectedHymnId) return;

    try {
      setIsSaving(true);
      const hymnRef = doc(firestore, 'hymns', selectedHymnId);

      const updatedPayload: FirestoreHymn = {
        id: selectedHymnId,
        name: editName,
        description: editDescription,
        genreIds: editGenreIds,
        subGenreId: editSubgenres,
        lyrics: {
          coptic: editCoptic,
          english: editEnglish,
          arabic: editArabic,
        },
        updatedAt: serverTimestamp(),
      };

      await updateDoc(hymnRef, updatedPayload as any);

      // Synchronize subgenre placement into each genre's content string
      const updatedGenres = [...genres];
      for (let i = 0; i < updatedGenres.length; i++) {
        const g = updatedGenres[i];
        let newContent: string;
        if (editGenreIds.includes(g.id)) {
          const targetSub = editSubgenres[g.id] || null;
          newContent = setHymnSubgenre(g.content, selectedHymnId, targetSub);
        } else {
          newContent = removeHymnFromGenre(g.content, selectedHymnId);
        }

        if (newContent !== g.content) {
          updatedGenres[i] = { ...g, content: newContent };
          const gRef = doc(firestore, 'genres', g.id);
          await updateDoc(gRef, {
            content: newContent,
            updatedAt: serverTimestamp(),
          });
        }
      }

      setGenres(updatedGenres);
      setHymns(prev =>
        prev.map(h => (h.id === selectedHymnId ? { ...h, ...updatedPayload } : h))
      );

      // Synchronize local catalog.json files
      try {
        const allHymns = hymns.map(h => (h.id === selectedHymnId ? { ...h, ...updatedPayload } : h));
        const catalogData = {
          generatedAt: new Date().toISOString(),
          genres: updatedGenres,
          cantors: defaultCatalog.cantors,
          hymns: allHymns,
        };
        await fetch('/api/admin/save-local-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catalogData),
        });
      } catch (syncErr) {
        console.warn('Could not sync local catalog copy:', syncErr);
      }

      toast({
        title: 'Hymn & Subgenres Saved',
        description: `Successfully saved "${editName}" and updated season subgenre placements.`,
      });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update hymn document.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create new hymn
  const handleCreateHymn = async () => {
    if (!firestore || !newHymnId.trim() || !newHymnName.trim()) return;

    const slug = newHymnId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    try {
      setIsCreating(true);
      const hymnRef = doc(firestore, 'hymns', slug);

      const newHymnData: FirestoreHymn = {
        id: slug,
        name: newHymnName.trim(),
        genreIds: newHymnGenre ? [newHymnGenre] : [],
        description: '',
        lyrics: {
          coptic: '',
          english: '',
          arabic: '',
        },
      };

      await setDoc(hymnRef, {
        ...newHymnData,
        updatedAt: serverTimestamp(),
      });

      setHymns(prev => [...prev, newHymnData].sort((a, b) => a.name.localeCompare(b.name)));
      selectHymn(newHymnData);
      setIsNewHymnOpen(false);
      setNewHymnId('');
      setNewHymnName('');
      setNewHymnGenre('');

      toast({
        title: 'Hymn Created',
        description: `Created new hymn "${newHymnName}". You can now add lyrics and recordings.`,
      });
    } catch (err: any) {
      console.error('Creation failed:', err);
      toast({
        title: 'Creation Failed',
        description: err.message || 'Could not create new hymn.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading Hymns & Lyrics Library...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Music2 className="w-6 h-6 text-primary" />
            <span>Hymns & Lyrics Manager</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Synchronized Coptic, English, and Arabic verse database in Cloud Firestore
          </p>
        </div>

        {/* Create New Hymn Dialog */}
        <Dialog open={isNewHymnOpen} onOpenChange={setIsNewHymnOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4" />
              <span>New Hymn</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-headline">Add New Hymn</DialogTitle>
              <DialogDescription className="text-xs">
                Creates a new hymn document in Cloud Firestore.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Hymn Name</label>
                <Input
                  placeholder="e.g. Golgotha"
                  value={newHymnName}
                  onChange={e => {
                    setNewHymnName(e.target.value);
                    if (!newHymnId) {
                      setNewHymnId(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }
                  }}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Unique ID (Slug)</label>
                <Input
                  placeholder="e.g. golgotha"
                  value={newHymnId}
                  onChange={e => setNewHymnId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Initial Liturgical Season</label>
                <Select value={newHymnGenre} onValueChange={setNewHymnGenre}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Season..." />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map(g => (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewHymnOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateHymn}
                disabled={isCreating || !newHymnName.trim() || !newHymnId.trim()}
                className="gap-1.5 bg-primary text-primary-foreground"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Create Hymn</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Split Layout: Left Sidebar List, Right Full Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hymns Directory (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search & Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search hymns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedGenreId} onValueChange={setSelectedGenreId}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="All Seasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Seasons</SelectItem>
                  {genres.map(g => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Filter..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="has-markers" className="text-xs">With Markers</SelectItem>
                  <SelectItem value="complete" className="text-xs">3 Languages</SelectItem>
                  <SelectItem value="missing-lyrics" className="text-xs">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hymns List Scrollable */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="p-2.5 bg-muted/40 border-b flex items-center justify-between text-xs text-muted-foreground">
              <span>{filteredHymns.length} Hymns</span>
            </div>

            <div className="divide-y max-h-[700px] overflow-y-auto">
              {filteredHymns.map(h => {
                const isSelected = selectedHymnId === h.id;
                const hasCoptic = Boolean(h.lyrics?.coptic?.trim());
                const hasEnglish = Boolean(h.lyrics?.english?.trim());
                const hasArabic = Boolean(h.lyrics?.arabic?.trim());
                const hymnRecs = recordings.filter(r => r.hymnId === h.id);
                const totalMarkers = hymnRecs.reduce((sum, r) => sum + (r.markers?.length || 0), 0);

                return (
                  <div
                    key={h.id}
                    onClick={() => selectHymn(h)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/15 border-l-4 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {h.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {totalMarkers > 0 && (
                          <Link
                            href={`/admin/markers?hymnId=${h.id}`}
                            onClick={e => e.stopPropagation()}
                            title={`Open in Marker Studio (${totalMarkers} markers)`}
                            className="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-primary transform translate-x-0.5' : 'text-muted-foreground/40'}`} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          hasCoptic
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'bg-muted text-muted-foreground/60'
                        }`}
                      >
                        COP
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          hasEnglish
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'bg-muted text-muted-foreground/60'
                        }`}
                      >
                        ENG
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          hasArabic
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'bg-muted text-muted-foreground/60'
                        }`}
                      >
                        ARA
                      </span>
                      {totalMarkers > 0 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30 ml-auto">
                          {totalMarkers} mk
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Hymn Editor & 3-Column Synchronized Lyrics (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {currentHymn ? (
            <>
              {/* Hymn Metadata Card */}
              <Card className="shadow-sm">
                <CardHeader className="py-4 px-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-headline">{currentHymn.name}</CardTitle>
                    <CardDescription className="text-xs">
                      Document ID: <code className="font-mono text-primary">{currentHymn.id}</code>
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                      <Link href={`/hymn/${currentHymn.id}`} target="_blank">
                        <ExternalLink className="w-3.5 h-3.5 text-primary" />
                        <span>View Public</span>
                      </Link>
                    </Button>

                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                      <Link href={`/admin/markers?hymnId=${currentHymn.id}`}>
                        <Sliders className="w-3.5 h-3.5 text-primary" />
                        <span>Marker Studio</span>
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSaveHymn}
                      disabled={isSaving}
                      className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save to Cloud</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Hymn Title</label>
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Liturgical Season Tags</label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {genres.map(g => {
                          const isTagged = editGenreIds.includes(g.id);
                          return (
                            <Badge
                              key={g.id}
                              variant={isTagged ? 'default' : 'outline'}
                              onClick={() => {
                                setEditGenreIds(prev => {
                                  if (isTagged) {
                                    setEditSubgenres(sPrev => {
                                      const sCopy = { ...sPrev };
                                      delete sCopy[g.id];
                                      return sCopy;
                                    });
                                    return prev.filter(x => x !== g.id);
                                  } else {
                                    return [...prev, g.id];
                                  }
                                });
                              }}
                              className="cursor-pointer text-[10px] select-none"
                            >
                              {g.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Description</label>
                    <Input
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="Brief liturgical note or occasion description..."
                      className="text-xs"
                    />
                  </div>

                  {/* Subgenre Placement per Season */}
                  {editGenreIds.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold flex items-center gap-1.5">
                          <FolderTree className="w-3.5 h-3.5 text-primary" />
                          <span>Subgenre Placements</span>
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          Controls where this hymn appears inside each Liturgical Season&apos;s playlist
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {editGenreIds.map(gid => {
                          const season = genres.find(g => g.id === gid);
                          const availableSubgenres = getAvailableSubgenres(season?.content);
                          const currentSubgenre = editSubgenres[gid] || '';
                          const isAddingCustom = addingCustomSubgenreFor === gid;

                          return (
                            <div key={gid} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {season?.name || gid}
                                </span>
                                {currentSubgenre ? (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                                    {currentSubgenre}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                    Uncategorized
                                  </span>
                                )}
                              </div>

                              {isAddingCustom ? (
                                <div className="flex gap-1.5 items-center">
                                  <Input
                                    placeholder="e.g. Matins, Liturgy..."
                                    value={customSubgenreInput}
                                    onChange={e => setCustomSubgenreInput(e.target.value)}
                                    className="h-8 text-xs flex-1"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (customSubgenreInput.trim()) {
                                          setEditSubgenres(prev => ({
                                            ...prev,
                                            [gid]: customSubgenreInput.trim(),
                                          }));
                                          setAddingCustomSubgenreFor(null);
                                          setCustomSubgenreInput('');
                                        }
                                      } else if (e.key === 'Escape') {
                                        setAddingCustomSubgenreFor(null);
                                        setCustomSubgenreInput('');
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs px-2.5"
                                    onClick={() => {
                                      if (customSubgenreInput.trim()) {
                                        setEditSubgenres(prev => ({
                                          ...prev,
                                          [gid]: customSubgenreInput.trim(),
                                        }));
                                        setAddingCustomSubgenreFor(null);
                                        setCustomSubgenreInput('');
                                      }
                                    }}
                                  >
                                    Set
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs px-2"
                                    onClick={() => {
                                      setAddingCustomSubgenreFor(null);
                                      setCustomSubgenreInput('');
                                    }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1.5 items-center">
                                  <Select
                                    value={currentSubgenre || '__none__'}
                                    onValueChange={val => {
                                      if (val === '__new__') {
                                        setAddingCustomSubgenreFor(gid);
                                        setCustomSubgenreInput('');
                                      } else if (val === '__none__') {
                                        setEditSubgenres(prev => {
                                          const copy = { ...prev };
                                          delete copy[gid];
                                          return copy;
                                        });
                                      } else {
                                        setEditSubgenres(prev => ({ ...prev, [gid]: val }));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs flex-1">
                                      <SelectValue placeholder="Select Subgenre..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__" className="text-xs text-muted-foreground">
                                        None (General / Other Hymns)
                                      </SelectItem>
                                      {availableSubgenres.map(sub => (
                                        <SelectItem key={sub} value={sub} className="text-xs">
                                          {sub}
                                        </SelectItem>
                                      ))}
                                      {currentSubgenre && !availableSubgenres.includes(currentSubgenre) && (
                                        <SelectItem value={currentSubgenre} className="text-xs">
                                          {currentSubgenre}
                                        </SelectItem>
                                      )}
                                      <SelectItem value="__new__" className="text-xs font-semibold text-primary">
                                        + Add new subgenre...
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Associated Recordings */}
                  {hymnRecordings.length > 0 && (
                    <div className="pt-2 border-t">
                      <label className="text-xs font-semibold text-muted-foreground block mb-2">
                        Linked Audio Recordings ({hymnRecordings.length})
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {hymnRecordings.map(rec => (
                          <div
                            key={rec.id}
                            className="p-2.5 rounded-lg border bg-muted/30 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-foreground">
                                {formatCantorName(rec.cantorId)}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    (rec.markers?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                  }`}
                                />
                                <span>
                                  {(rec.markers?.length || 0) > 0 ? `${rec.markers?.length} markers` : 'No markers yet'}
                                </span>
                              </div>
                            </div>
                            <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1">
                              <Link href={`/admin/markers?recordingId=${rec.id}`}>
                                <Sliders className="w-3 h-3 text-primary" />
                                <span>Studio</span>
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Synchronized 3-Column Lyrics Editor */}
              <Card className="shadow-sm">
                <CardHeader className="py-4 px-6 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span>Synchronized 3-Language Lyrics</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Each line corresponds to one verse segment in the marker alignment engine.
                    </CardDescription>
                  </div>

                  {/* Line Match Pill */}
                  <div>
                    {linesMatch ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Lines Aligned ({copticLines} verses)</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Line Mismatch: Cop({copticLines}) Eng({englishLines}) Ara({arabicLines})</span>
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Coptic Column */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">Coptic Text</label>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {copticLines} lines
                        </span>
                      </div>
                      <Textarea
                        rows={16}
                        value={editCoptic}
                        onChange={e => setEditCoptic(e.target.value)}
                        placeholder="Ⲡⲓⲙⲁⲓⲣⲱⲙⲓ..."
                        className="font-coptic text-sm leading-relaxed whitespace-pre font-normal resize-y"
                      />
                    </div>

                    {/* English Column */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">English / Phonetical</label>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {englishLines} lines
                        </span>
                      </div>
                      <Textarea
                        rows={16}
                        value={editEnglish}
                        onChange={e => setEditEnglish(e.target.value)}
                        placeholder="O lover of mankind..."
                        className="text-xs leading-relaxed whitespace-pre resize-y"
                      />
                    </div>

                    {/* Arabic Column */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">Arabic Translation</label>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {arabicLines} lines
                        </span>
                      </div>
                      <Textarea
                        rows={16}
                        value={editArabic}
                        onChange={e => setEditArabic(e.target.value)}
                        placeholder="يا محب البشر..."
                        dir="rtl"
                        className="font-arabic text-xs leading-relaxed whitespace-pre resize-y"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground border rounded-xl bg-card">
              <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <h3 className="font-semibold text-base text-foreground">No Hymn Selected</h3>
              <p className="text-xs mt-1">Select a hymn from the directory on the left to edit lyrics and details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminHymnsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminHymnsContent />
    </Suspense>
  );
}
