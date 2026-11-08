'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { getStorage } from 'firebase/storage';
import { compileAndPublishCatalog } from '@/lib/publish-catalog';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { FirestoreGenre, FirestoreHymn } from '@/types/admin';
import defaultCatalog from '@/data/catalog.json';
import { useAdminAuth } from '@/context/admin-auth-context';
import { recordPendingChange } from '@/lib/pending-changes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Plus,
  Save,
  Loader2,
  GripVertical,
  ChevronRight,
  FolderTree,
  Pencil,
  Trash2,
  Check,
  X,
  Music,
} from 'lucide-react';
import {
  parseGenreContent,
  serializeGenreContent,
  addSubgenre,
  renameSubgenre,
  deleteSubgenre,
  reorderHymnsWithinSubgenre,
  setHymnSubgenre,
  removeHymnFromGenre,
} from '@/lib/subgenre-utils';

export default function AdminSeasonsPage() {
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useAdminAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [genres, setGenres] = useState<FirestoreGenre[]>([]);
  const [hymns, setHymns] = useState<FirestoreHymn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  // Drag and drop state for Season rows
  const [draggedSeasonIdx, setDraggedSeasonIdx] = useState<number | null>(null);
  const [dragOverSeasonIdx, setDragOverSeasonIdx] = useState<number | null>(null);
  const [rankInputs, setRankInputs] = useState<Record<string, string>>({});

  // Hymn drag-and-drop within subgenre
  const [draggedHymn, setDraggedHymn] = useState<{
    seasonId: string;
    subgenreName: string;
    hymnIdx: number;
  } | null>(null);
  const [dragOverHymnIdx, setDragOverHymnIdx] = useState<number | null>(null);
  const [hymnRankInputs, setHymnRankInputs] = useState<Record<string, string>>({});

  // Subgenres accordion & editing state
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
  const [draggedSubgenreIdx, setDraggedSubgenreIdx] = useState<number | null>(null);
  const [dragOverSubgenreIdx, setDragOverSubgenreIdx] = useState<number | null>(null);
  const [editingSubgenre, setEditingSubgenre] = useState<{
    seasonId: string;
    oldName: string;
    currentName: string;
  } | null>(null);
  const [newSubgenreNames, setNewSubgenreNames] = useState<Record<string, string>>({});
  const [isAddingSubgenre, setIsAddingSubgenre] = useState<string | null>(null);

  // New Season Modal
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newBackgroundUrl, setNewBackgroundUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fast hymn lookup map
  const hymnsMap = useMemo(() => {
    return new Map(hymns.map(h => [h.id, h]));
  }, [hymns]);

  useEffect(() => {
    async function loadData() {
      if (!firestore) return;
      try {
        setIsLoading(true);
        const [genresSnap, hymnsSnap] = await Promise.all([
          getDocs(collection(firestore, 'genres')),
          getDocs(collection(firestore, 'hymns')),
        ]);

        const fallbackGenresMap = new Map((defaultCatalog.genres as any[]).map(g => [g.id, g]));
        const list = genresSnap.docs
          .filter(d => d.id !== 'app_settings' && d.id !== '__app_settings__')
          .map(d => {
          const data = d.data() as any;
          const fallback = fallbackGenresMap.get(d.id);
          return {
            id: d.id,
            ...data,
            content: data.content || fallback?.content || '',
          } as FirestoreGenre;
        });

        // Sort by rank, then fallback to catalog order
        list.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

        // Re-assign ranks 1..N based on initial display order
        const normalized = list.map((g, idx) => ({ ...g, rank: idx + 1 }));
        setGenres(normalized);

        const hList = hymnsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreHymn));
        setHymns(hList);
      } catch (err) {
        console.error('Failed to load seasons & hymns:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [firestore]);

  // Synchronize local catalog copy
  const syncLocalCatalog = async (updatedGenres: FirestoreGenre[]) => {
    try {
      const catalogData = {
        generatedAt: new Date().toISOString(),
        genres: updatedGenres,
        cantors: defaultCatalog.cantors,
        hymns: hymns.length > 0 ? hymns : defaultCatalog.hymns,
      };
      await fetch('/api/admin/save-local-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catalogData),
      });
    } catch (syncErr) {
      console.warn('Could not sync local catalog copy:', syncErr);
    }
  };

  // Reordering Seasons via Drag and Drop
  const handleSeasonDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedSeasonIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleSeasonDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSeasonIdx !== idx) {
      setDragOverSeasonIdx(idx);
    }
  };

  const handleSeasonDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedSeasonIdx === null || draggedSeasonIdx === targetIdx) {
      setDraggedSeasonIdx(null);
      setDragOverSeasonIdx(null);
      return;
    }

    const newGenres = [...genres];
    const [moved] = newGenres.splice(draggedSeasonIdx, 1);
    newGenres.splice(targetIdx, 0, moved);
    const withRanks = newGenres.map((g, i) => ({ ...g, rank: i + 1 }));

    setGenres(withRanks);
    setHasUnsavedOrder(true);
    setDraggedSeasonIdx(null);
    setDragOverSeasonIdx(null);
  };

  // Typing rank commits a position change automatically
  const commitRankChange = (seasonId: string, currentIdx: number) => {
    const raw = rankInputs[seasonId];
    if (raw === undefined || raw === '') {
      setRankInputs(prev => {
        const next = { ...prev };
        delete next[seasonId];
        return next;
      });
      return;
    }

    const parsed = parseInt(raw, 10);
    setRankInputs(prev => {
      const next = { ...prev };
      delete next[seasonId];
      return next;
    });

    if (isNaN(parsed) || parsed < 1) return;
    const targetIdx = Math.max(0, Math.min(genres.length - 1, parsed - 1));
    if (targetIdx === currentIdx) return;

    const newGenres = [...genres];
    const [moved] = newGenres.splice(currentIdx, 1);
    newGenres.splice(targetIdx, 0, moved);
    const withRanks = newGenres.map((g, i) => ({ ...g, rank: i + 1 }));

    setGenres(withRanks);
    setHasUnsavedOrder(true);
  };

  // Save All Season Ranks based on table ordering
  const handleSaveAllOrder = async () => {
    if (!firestore) return;
    try {
      setIsSaving(true);
      const prevOrder = genres.map(g => ({ id: g.id, rank: g.rank }));

      await Promise.all(
        genres.map((g, idx) => {
          const gRef = doc(firestore, 'genres', g.id);
          return updateDoc(gRef, {
            rank: idx + 1,
            updatedAt: serverTimestamp(),
          });
        })
      );

      const withRanks = genres.map((g, idx) => ({ ...g, rank: idx + 1 }));
      await syncLocalCatalog(withRanks);

      // Record pending change for staging review & 1-click undo
      await recordPendingChange(firestore, {
        entityType: 'season',
        entityId: 'all_seasons_order',
        entityName: 'Liturgical Seasons Order',
        action: 'reorder',
        summary: `Re-ranked ${genres.length} liturgical seasons`,
        previousSnapshot: prevOrder,
        newSnapshot: withRanks.map(g => ({ id: g.id, rank: g.rank })),
        userEmail: user?.email || 'admin',
      });

      setHasUnsavedOrder(false);

      toast({
        title: 'Season Order Saved',
        description: `Successfully ranked ${genres.length} liturgical seasons from #1 to #${genres.length}. Ready to Publish to CDN.`,
      });
    } catch (err: any) {
      console.error('Failed to save season order:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update season ranks.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update a single Season document
  const handleUpdateGenre = async (genre: FirestoreGenre) => {
    if (!firestore) return;
    try {
      setIsSaving(true);
      const prevGenre = genres.find(g => g.id === genre.id);
      const gRef = doc(firestore, 'genres', genre.id);
      const payload: any = {
        name: genre.name,
        rank: Number(genre.rank),
        active: genre.active !== false,
        cantorCloudActive: genre.cantorCloudActive !== false,
        backgroundUrl: genre.backgroundUrl || '',
        content: genre.content || '',
        updatedAt: serverTimestamp(),
      };

      await updateDoc(gRef, payload);
      await syncLocalCatalog(genres.map(g => (g.id === genre.id ? { ...g, ...payload } : g)));

      // Record pending change for staging review & 1-click undo
      await recordPendingChange(firestore, {
        entityType: 'season',
        entityId: genre.id,
        entityName: genre.name,
        action: 'update',
        summary: `Updated season details & subgenres`,
        previousSnapshot: prevGenre ? {
          name: prevGenre.name,
          rank: prevGenre.rank,
          active: prevGenre.active,
          cantorCloudActive: prevGenre.cantorCloudActive,
          backgroundUrl: prevGenre.backgroundUrl || '',
          content: prevGenre.content || '',
        } : null,
        newSnapshot: payload,
        userEmail: user?.email || 'admin',
      });

      toast({
        title: 'Season Updated',
        description: `Successfully updated ${genre.name} and its subgenres.`,
      });
    } catch (err: any) {
      console.error('Failed to update season:', err);
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update season document.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new Season
  const handleCreateGenre = async () => {
    if (!firestore || !newId.trim() || !newName.trim()) return;

    const slug = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newRank = genres.length + 1;

    try {
      setIsCreating(true);
      const gRef = doc(firestore, 'genres', slug);

      const newGenreData: FirestoreGenre = {
        id: slug,
        name: newName.trim(),
        rank: newRank,
        active: true,
        cantorCloudActive: true,
        backgroundUrl: newBackgroundUrl.trim(),
        content: '',
      };

      await setDoc(gRef, {
        ...newGenreData,
        updatedAt: serverTimestamp(),
      });

      const updated = [...genres, newGenreData].map((g, idx) => ({ ...g, rank: idx + 1 }));
      setGenres(updated);
      await syncLocalCatalog(updated);

      setIsOpenNew(false);
      setNewId('');
      setNewName('');
      setNewBackgroundUrl('');

      toast({
        title: 'Season Created',
        description: `Added "${newName}" to liturgical seasons as #${newRank}.`,
      });
    } catch (err: any) {
      console.error('Creation failed:', err);
      toast({
        title: 'Creation Failed',
        description: err.message || 'Could not create season.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Subgenre drag & drop reorder
  const handleSubgenreDragStart = (e: React.DragEvent, idx: number) => {
    e.stopPropagation();
    setDraggedSubgenreIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleSubgenreDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSubgenreIdx !== idx) {
      setDragOverSubgenreIdx(idx);
    }
  };

  const handleSubgenreDrop = (e: React.DragEvent, season: FirestoreGenre, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSubgenreIdx === null || draggedSubgenreIdx === targetIdx) {
      setDraggedSubgenreIdx(null);
      setDragOverSubgenreIdx(null);
      return;
    }

    const sections = parseGenreContent(season.content);
    const [moved] = sections.splice(draggedSubgenreIdx, 1);
    sections.splice(targetIdx, 0, moved);
    const newContent = serializeGenreContent(sections);

    setGenres(prev =>
      prev.map(g => (g.id === season.id ? { ...g, content: newContent } : g))
    );
    setDraggedSubgenreIdx(null);
    setDragOverSubgenreIdx(null);
  };

  // Hymn drag & drop reorder within a subgenre
  const handleHymnDragStart = (
    e: React.DragEvent,
    seasonId: string,
    subgenreName: string,
    hymnIdx: number
  ) => {
    e.stopPropagation();
    setDraggedHymn({ seasonId, subgenreName, hymnIdx });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(hymnIdx));
  };

  const handleHymnDragOver = (e: React.DragEvent, hymnIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverHymnIdx !== hymnIdx) {
      setDragOverHymnIdx(hymnIdx);
    }
  };

  const handleHymnDrop = (
    e: React.DragEvent,
    season: FirestoreGenre,
    subgenreName: string,
    targetIdx: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !draggedHymn ||
      draggedHymn.seasonId !== season.id ||
      draggedHymn.subgenreName !== subgenreName ||
      draggedHymn.hymnIdx === targetIdx
    ) {
      setDraggedHymn(null);
      setDragOverHymnIdx(null);
      return;
    }

    const sections = parseGenreContent(season.content);
    const sec = sections.find(s => s.name.toLowerCase() === subgenreName.toLowerCase());
    if (!sec) {
      setDraggedHymn(null);
      setDragOverHymnIdx(null);
      return;
    }

    const newHymnIds = [...sec.hymnIds];
    const [movedId] = newHymnIds.splice(draggedHymn.hymnIdx, 1);
    newHymnIds.splice(targetIdx, 0, movedId);

    const newContent = reorderHymnsWithinSubgenre(season.content, subgenreName, newHymnIds);
    setGenres(prev =>
      prev.map(g => (g.id === season.id ? { ...g, content: newContent } : g))
    );

    setDraggedHymn(null);
    setDragOverHymnIdx(null);
  };

  // Hymn rank input change within a subgenre
  const handleHymnRankCommit = (
    season: FirestoreGenre,
    subgenreName: string,
    currentHIdx: number,
    hymnId: string
  ) => {
    const raw = hymnRankInputs[`${season.id}-${subgenreName}-${hymnId}`];
    if (raw === undefined || raw === '') {
      setHymnRankInputs(prev => {
        const next = { ...prev };
        delete next[`${season.id}-${subgenreName}-${hymnId}`];
        return next;
      });
      return;
    }

    const parsed = parseInt(raw, 10);
    setHymnRankInputs(prev => {
      const next = { ...prev };
      delete next[`${season.id}-${subgenreName}-${hymnId}`];
      return next;
    });

    if (isNaN(parsed) || parsed < 1) return;
    const sections = parseGenreContent(season.content);
    const sec = sections.find(s => s.name.toLowerCase() === subgenreName.toLowerCase());
    if (!sec) return;

    const targetIdx = Math.max(0, Math.min(sec.hymnIds.length - 1, parsed - 1));
    if (targetIdx === currentHIdx) return;

    const newHymnIds = [...sec.hymnIds];
    const [movedId] = newHymnIds.splice(currentHIdx, 1);
    newHymnIds.splice(targetIdx, 0, movedId);

    const newContent = reorderHymnsWithinSubgenre(season.content, subgenreName, newHymnIds);
    setGenres(prev =>
      prev.map(g => (g.id === season.id ? { ...g, content: newContent } : g))
    );
  };

  const handleMoveHymnToSubgenre = (
    season: FirestoreGenre,
    hymnId: string,
    targetSubgenre: string
  ) => {
    const newContent = setHymnSubgenre(season.content, hymnId, targetSubgenre);
    setGenres(prev =>
      prev.map(g => (g.id === season.id ? { ...g, content: newContent } : g))
    );
  };

  const handleRemoveHymnFromSubgenre = (
    season: FirestoreGenre,
    hymnId: string
  ) => {
    const newContent = removeHymnFromGenre(season.content, hymnId);
    setGenres(prev =>
      prev.map(g => (g.id === season.id ? { ...g, content: newContent } : g))
    );
  };

  const handleAddHymnToSubgenre = (
    season: FirestoreGenre,
    hymnId: string,
    targetSubgenre: string
  ) => {
    const newContent = setHymnSubgenre(season.content, hymnId, targetSubgenre);
    setGenres(prev =>
      prev.map(g => (g.id === season.id ? { ...g, content: newContent } : g))
    );
  };

  const handleSaveRenameSubgenre = (seasonId: string) => {
    if (!editingSubgenre || !editingSubgenre.currentName.trim()) {
      setEditingSubgenre(null);
      return;
    }
    const season = genres.find(g => g.id === seasonId);
    if (!season) return;

    const newContent = renameSubgenre(season.content, editingSubgenre.oldName, editingSubgenre.currentName);
    setGenres(prev =>
      prev.map(g => (g.id === seasonId ? { ...g, content: newContent } : g))
    );
    setEditingSubgenre(null);
  };

  const handleAddSubgenre = (seasonId: string) => {
    const name = newSubgenreNames[seasonId]?.trim();
    if (!name) return;

    const season = genres.find(g => g.id === seasonId);
    if (!season) return;

    const newContent = addSubgenre(season.content, name);
    setGenres(prev =>
      prev.map(g => (g.id === seasonId ? { ...g, content: newContent } : g))
    );
    setNewSubgenreNames(prev => ({ ...prev, [seasonId]: '' }));
    setIsAddingSubgenre(null);
  };

  const handleDeleteSubgenre = (seasonId: string, subgenreName: string) => {
    const season = genres.find(g => g.id === seasonId);
    if (!season) return;

    const newContent = deleteSubgenre(season.content, subgenreName);
    setGenres(prev =>
      prev.map(g => (g.id === seasonId ? { ...g, content: newContent } : g))
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading Liturgical Seasons & Subgenres...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            <span>Season & Hymns Order</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure liturgical seasons, display ranks, subgenres, and hymn order sequence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedOrder && (
            <Button
              size="sm"
              onClick={handleSaveAllOrder}
              disabled={isSaving}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm animate-pulse"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Season Order</span>
            </Button>
          )}

          <Dialog open={isOpenNew} onOpenChange={setIsOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                <Plus className="w-4 h-4" />
                <span>Add Season</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-headline">Add Liturgical Season</DialogTitle>
                <DialogDescription className="text-xs">
                  Creates a new liturgical season document in Cloud Firestore.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Season Name</label>
                  <Input
                    placeholder="e.g. Pentecost"
                    value={newName}
                    onChange={e => {
                      setNewName(e.target.value);
                      if (!newId) {
                        setNewId(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      }
                    }}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Unique ID (Slug)</label>
                  <Input
                    placeholder="e.g. pentecost"
                    value={newId}
                    onChange={e => setNewId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Background Image Path (Storage)</label>
                  <Input
                    placeholder="e.g. genres/backgrounds/Pentecost.jpeg"
                    value={newBackgroundUrl}
                    onChange={e => setNewBackgroundUrl(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpenNew(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateGenre}
                  disabled={isCreating || !newName.trim() || !newId.trim()}
                  className="gap-1.5 bg-primary text-primary-foreground"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add Season</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seasons Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-3 w-20 text-center">Rank</th>
                <th className="py-3 px-4">Season Name</th>
                <th className="py-3 px-4">Identifier (ID)</th>
                <th className="py-3 px-4">Subgenres</th>
                <th className="py-3 px-4">Background Storage Path</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-center">CantorCloud</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {genres.map((g, idx) => {
                const isExpanded = expandedSeasonId === g.id;
                const subgenreSections = parseGenreContent(g.content);
                const isDraggingThis = draggedSeasonIdx === idx;
                const isDragOver = dragOverSeasonIdx === idx;

                return (
                  <React.Fragment key={g.id}>
                    <tr
                      draggable
                      onDragStart={e => handleSeasonDragStart(e, idx)}
                      onDragOver={e => handleSeasonDragOver(e, idx)}
                      onDrop={e => handleSeasonDrop(e, idx)}
                      onDragEnd={() => {
                        setDraggedSeasonIdx(null);
                        setDragOverSeasonIdx(null);
                      }}
                      className={`transition-colors ${
                        isDraggingThis ? 'opacity-40 bg-muted/50' : ''
                      } ${
                        isDragOver
                          ? 'border-t-2 border-primary bg-primary/10'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      {/* Rank & Drag Handle Column */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1 rounded"
                            title="Drag row to reorder season"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={rankInputs[g.id] !== undefined ? rankInputs[g.id] : String(idx + 1)}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setRankInputs(prev => ({ ...prev, [g.id]: val }));
                            }}
                            onBlur={() => commitRankChange(g.id, idx)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitRankChange(g.id, idx);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-11 h-7 text-xs font-mono font-bold text-center px-1 py-0 bg-muted/60"
                            title="Type rank number and press Enter to adjust location"
                          />
                        </div>
                      </td>

                      {/* Season Name & Expand Toggle */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedSeasonId(isExpanded ? null : g.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-transform"
                            title={isExpanded ? 'Collapse subgenres' : 'Expand subgenres'}
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform ${
                                isExpanded ? 'transform rotate-90 text-primary' : ''
                              }`}
                            />
                          </button>
                          <Input
                            value={g.name}
                            onChange={e => {
                              const val = e.target.value;
                              setGenres(prev =>
                                prev.map(x => (x.id === g.id ? { ...x, name: val } : x))
                              );
                            }}
                            className="h-8 text-xs font-semibold max-w-xs"
                          />
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
                        {g.id}
                      </td>

                      {/* Subgenres Preview / Button */}
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedSeasonId(isExpanded ? null : g.id)}
                          className="flex items-center gap-1.5 text-xs text-left group"
                        >
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-colors ${
                              subgenreSections.length > 0
                                ? 'bg-primary/10 text-primary group-hover:bg-primary/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {subgenreSections.length}{' '}
                            {subgenreSections.length === 1 ? 'Subgenre' : 'Subgenres'}
                          </span>

                          <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[150px]">
                            {subgenreSections.map(s => s.name).slice(0, 2).join(', ')}
                            {subgenreSections.length > 2 ? '...' : ''}
                          </span>
                        </button>
                      </td>

                      {/* Background */}
                      <td className="py-2.5 px-4">
                        <Input
                          value={g.backgroundUrl || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setGenres(prev =>
                              prev.map(x => (x.id === g.id ? { ...x, backgroundUrl: val } : x))
                            );
                          }}
                          className="h-8 text-xs font-mono max-w-sm"
                        />
                      </td>

                      {/* Active */}
                      <td className="py-2.5 px-4 text-center">
                        <Switch
                          checked={g.active !== false}
                          onCheckedChange={val => {
                            setGenres(prev =>
                              prev.map(x => (x.id === g.id ? { ...x, active: val } : x))
                            );
                          }}
                        />
                      </td>

                      {/* CantorCloud */}
                      <td className="py-2.5 px-4 text-center">
                        <Switch
                          checked={g.cantorCloudActive !== false}
                          onCheckedChange={val => {
                            setGenres(prev =>
                              prev.map(x =>
                                x.id === g.id ? { ...x, cantorCloudActive: val } : x
                              )
                            );
                          }}
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateGenre(g)}
                          disabled={isSaving}
                          className="h-8 text-xs gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </Button>
                      </td>
                    </tr>

                    {/* Expandable Subgenres Manager Sub-Row */}
                    {isExpanded && (
                      <tr className="bg-muted/15 border-b">
                        <td colSpan={8} className="p-4 pl-10 pr-6">
                          <div className="bg-card rounded-xl border p-4 shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                              <div>
                                <h3 className="font-semibold text-xs flex items-center gap-2 text-foreground">
                                  <FolderTree className="w-4 h-4 text-primary" />
                                  <span>Subgenres in {g.name}</span>
                                  <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {subgenreSections.length}{' '}
                                    {subgenreSections.length === 1 ? 'Subgenre' : 'Subgenres'}
                                  </span>
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Drag subgenre cards to reorder playlist sequence in the app. Click the pencil to rename.
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {isAddingSubgenre === g.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      placeholder="Subgenre name (e.g. Matins)..."
                                      value={newSubgenreNames[g.id] || ''}
                                      onChange={e =>
                                        setNewSubgenreNames(prev => ({ ...prev, [g.id]: e.target.value }))
                                      }
                                      className="h-7 text-xs w-48"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddSubgenre(g.id);
                                        if (e.key === 'Escape') setIsAddingSubgenre(null);
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs px-2.5 bg-primary text-primary-foreground"
                                      onClick={() => handleAddSubgenre(g.id)}
                                    >
                                      Add
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs px-1.5"
                                      onClick={() => setIsAddingSubgenre(null)}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => setIsAddingSubgenre(g.id)}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Subgenre</span>
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                                  onClick={() => handleUpdateGenre(g)}
                                  disabled={isSaving}
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save Subgenres</span>
                                </Button>
                              </div>
                            </div>

                            {/* Subgenres List */}
                            {subgenreSections.length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-lg bg-muted/10">
                                No subgenres configured for this season yet. All hymns appear under &quot;Other Hymns&quot;.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {subgenreSections.map((sec, sIdx) => {
                                  const isEditingThis =
                                    editingSubgenre?.seasonId === g.id &&
                                    editingSubgenre?.oldName === sec.name;
                                  const hymnsInThisSection = sec.hymnIds.map(
                                    hid => hymnsMap.get(hid) || { id: hid, name: hid }
                                  );

                                  return (
                                    <div
                                      key={`${sec.name}-${sIdx}`}
                                      draggable={!isEditingThis}
                                      onDragStart={e => handleSubgenreDragStart(e, sIdx)}
                                      onDragOver={e => handleSubgenreDragOver(e, sIdx)}
                                      onDrop={e => handleSubgenreDrop(e, g, sIdx)}
                                      onDragEnd={() => {
                                        setDraggedSubgenreIdx(null);
                                        setDragOverSubgenreIdx(null);
                                      }}
                                      className={`p-2.5 rounded-lg border bg-background flex flex-col gap-2 transition-all ${
                                        dragOverSubgenreIdx === sIdx
                                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                          : 'hover:border-muted-foreground/30'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1">
                                          <div
                                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 rounded"
                                            title="Drag to reorder subgenre"
                                          >
                                            <GripVertical className="w-3.5 h-3.5" />
                                          </div>
                                          <span className="text-[11px] font-mono font-bold text-muted-foreground w-5">
                                            #{sIdx + 1}
                                          </span>

                                          {isEditingThis ? (
                                            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                              <Input
                                                value={editingSubgenre.currentName}
                                                onChange={e =>
                                                  setEditingSubgenre({
                                                    ...editingSubgenre,
                                                    currentName: e.target.value,
                                                  })
                                                }
                                                className="h-7 text-xs font-semibold"
                                                autoFocus
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter') handleSaveRenameSubgenre(g.id);
                                                  if (e.key === 'Escape') setEditingSubgenre(null);
                                                }}
                                              />
                                              <Button
                                                size="sm"
                                                className="h-7 text-xs px-2"
                                                onClick={() => handleSaveRenameSubgenre(g.id)}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs px-1.5"
                                                onClick={() => setEditingSubgenre(null)}
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-xs text-foreground">
                                                {sec.name}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setEditingSubgenre({
                                                    seasonId: g.id,
                                                    oldName: sec.name,
                                                    currentName: sec.name,
                                                  })
                                                }
                                                title="Rename subgenre"
                                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {/* Quick Add Hymn to this subgenre */}
                                          <Select
                                            onValueChange={hymnId => handleAddHymnToSubgenre(g, hymnId, sec.name)}
                                          >
                                            <SelectTrigger className="h-6 text-[10px] px-2 py-0 border-dashed border-primary/40 text-primary hover:bg-primary/5">
                                              <Plus className="w-3 h-3 mr-1" />
                                              <span>Add Hymn</span>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                              {hymns
                                                .filter(h => !sec.hymnIds.includes(h.id))
                                                .map(h => (
                                                  <SelectItem key={h.id} value={h.id} className="text-xs">
                                                    {h.name} ({h.id})
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>

                                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                            {sec.hymnIds.length}{' '}
                                            {sec.hymnIds.length === 1 ? 'hymn' : 'hymns'}
                                          </span>

                                          <button
                                            type="button"
                                            onClick={() => handleDeleteSubgenre(g.id, sec.name)}
                                            title="Delete subgenre"
                                            className="p-1 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Hymns List inside this subgenre */}
                                      <div className="pl-6 pt-2 space-y-1.5 border-t border-muted/50">
                                        {sec.hymnIds.length === 0 ? (
                                          <div className="py-2 px-3 text-[11px] text-muted-foreground italic bg-muted/20 rounded border border-dashed text-center">
                                            No hymns in this subgenre yet. Add hymns using &quot;Add Hymn&quot; above or assign from unassigned hymns below.
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {sec.hymnIds.map((hid, hIdx) => {
                                              const hymnObj = hymnsMap.get(hid);
                                              const hymnKey = `${g.id}-${sec.name}-${hid}`;
                                              const isDraggingHymn =
                                                draggedHymn?.seasonId === g.id &&
                                                draggedHymn?.subgenreName === sec.name &&
                                                draggedHymn?.hymnIdx === hIdx;
                                              const isDragOverHymn =
                                                dragOverHymnIdx === hIdx && draggedHymn?.subgenreName === sec.name;

                                              return (
                                                <div
                                                  key={hid}
                                                  draggable
                                                  onDragStart={e => handleHymnDragStart(e, g.id, sec.name, hIdx)}
                                                  onDragOver={e => handleHymnDragOver(e, hIdx)}
                                                  onDrop={e => handleHymnDrop(e, g, sec.name, hIdx)}
                                                  onDragEnd={() => {
                                                    setDraggedHymn(null);
                                                    setDragOverHymnIdx(null);
                                                  }}
                                                  className={`flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-md border bg-card text-xs transition-colors ${
                                                    isDraggingHymn ? 'opacity-40 bg-muted/60' : ''
                                                  } ${
                                                    isDragOverHymn
                                                      ? 'border-t-2 border-primary bg-primary/10'
                                                      : 'hover:border-muted-foreground/30'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <div
                                                      className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-0.5 rounded shrink-0"
                                                      title="Drag row to reorder hymn sequence"
                                                    >
                                                      <GripVertical className="w-3.5 h-3.5" />
                                                    </div>

                                                    {/* Editable hymn rank */}
                                                    <Input
                                                      type="text"
                                                      inputMode="numeric"
                                                      pattern="[0-9]*"
                                                      value={
                                                        hymnRankInputs[hymnKey] !== undefined
                                                          ? hymnRankInputs[hymnKey]
                                                          : String(hIdx + 1)
                                                      }
                                                      onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setHymnRankInputs(prev => ({ ...prev, [hymnKey]: val }));
                                                      }}
                                                      onBlur={() => handleHymnRankCommit(g, sec.name, hIdx, hid)}
                                                      onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                          handleHymnRankCommit(g, sec.name, hIdx, hid);
                                                          (e.target as HTMLInputElement).blur();
                                                        }
                                                      }}
                                                      className="w-9 h-6 text-[11px] font-mono font-bold text-center px-1 py-0 bg-muted/50 shrink-0"
                                                      title="Type position number and press Enter"
                                                    />

                                                    <Music className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    <span className="font-semibold text-foreground truncate text-xs">
                                                      {hymnObj?.name || hid}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-muted-foreground truncate hidden sm:inline">
                                                      ({hid})
                                                    </span>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {/* Move to another subgenre */}
                                                    {subgenreSections.length > 1 && (
                                                      <Select
                                                        value={sec.name}
                                                        onValueChange={targetSec => handleMoveHymnToSubgenre(g, hid, targetSec)}
                                                      >
                                                        <SelectTrigger className="h-6 text-[10px] px-2 py-0 border-muted bg-muted/30">
                                                          <SelectValue placeholder="Move to..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {subgenreSections
                                                            .filter(s => s.name !== sec.name)
                                                            .map(s => (
                                                              <SelectItem key={s.name} value={s.name} className="text-xs">
                                                                Move to {s.name}
                                                              </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                      </Select>
                                                    )}

                                                    {/* Remove from subgenre */}
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemoveHymnFromSubgenre(g, hid)}
                                                      title="Remove from subgenre"
                                                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Unassigned Hymns Section for this Season */}
                            {(() => {
                              const seasonHymns = hymns.filter(h => h.genreIds?.includes(g.id) || (h as any).genreId === g.id);
                              const assignedHymnIds = new Set(subgenreSections.flatMap(s => s.hymnIds));
                              const unassigned = seasonHymns.filter(h => !assignedHymnIds.has(h.id));

                              if (unassigned.length === 0) return null;

                              return (
                                <div className="pt-3 border-t mt-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <span>Unassigned Season Hymns</span>
                                        <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
                                          {unassigned.length}
                                        </Badge>
                                      </h4>
                                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                        Tagged with this season but not yet ordered into a subgenre
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {unassigned.map(uh => (
                                      <div
                                        key={uh.id}
                                        className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/20 text-xs"
                                      >
                                        <div className="flex items-center gap-1.5 truncate min-w-0">
                                          <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                          <span className="font-medium truncate text-foreground">{uh.name}</span>
                                        </div>

                                        {subgenreSections.length > 0 && (
                                          <Select
                                            onValueChange={targetSec => handleMoveHymnToSubgenre(g, uh.id, targetSec)}
                                          >
                                            <SelectTrigger className="h-6 text-[10px] px-2 py-0 border-primary/30 shrink-0 bg-background text-primary">
                                              <SelectValue placeholder="+ Slot into..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {subgenreSections.map(s => (
                                                <SelectItem key={s.name} value={s.name} className="text-xs">
                                                  {s.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
