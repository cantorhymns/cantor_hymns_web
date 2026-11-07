'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { FirestoreCantor, FirestoreRecording, FirestoreHymn } from '@/types/admin';
import defaultCatalog from '@/data/catalog.json';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  Users,
  Plus,
  Save,
  Loader2,
  GripVertical,
  ChevronRight,
  Sliders,
  Music,
  ExternalLink,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';

export default function AdminCantorsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [cantors, setCantors] = useState<FirestoreCantor[]>([]);
  const [recordings, setRecordings] = useState<FirestoreRecording[]>([]);
  const [hymns, setHymns] = useState<FirestoreHymn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  // Drag-and-drop state for Cantor rows
  const [draggedCantorIdx, setDraggedCantorIdx] = useState<number | null>(null);
  const [dragOverCantorIdx, setDragOverCantorIdx] = useState<number | null>(null);
  const [rankInputs, setRankInputs] = useState<Record<string, string>>({});

  // Expanded recordings sub-row
  const [expandedCantorId, setExpandedCantorId] = useState<string | null>(null);

  // New Cantor Modal
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [newCloudActive, setNewCloudActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Hymns map for fast name lookup
  const hymnsMap = useMemo(() => {
    return new Map(hymns.map(h => [h.id, h]));
  }, [hymns]);

  useEffect(() => {
    async function loadData() {
      if (!firestore) return;
      try {
        setIsLoading(true);
        const [cantorsSnap, recsSnap, hymnsSnap] = await Promise.all([
          getDocs(collection(firestore, 'cantors')),
          getDocs(collection(firestore, 'recordings')),
          getDocs(collection(firestore, 'hymns')),
        ]);

        const fallbackCantorsMap = new Map((defaultCatalog.cantors as any[]).map(c => [c.id, c]));
        const list = cantorsSnap.docs.map(d => {
          const data = d.data() as any;
          const fallback = fallbackCantorsMap.get(d.id);
          return {
            id: d.id,
            ...data,
            active: data.active !== false,
            cantorCloudActive: data.cantorCloudActive !== false,
            rank: data.rank ?? fallback?.rank ?? 99,
          } as FirestoreCantor;
        });

        // Sort by rank
        list.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

        // Normalize ranks strictly 1..N based on table order
        const normalized = list.map((c, idx) => ({ ...c, rank: idx + 1 }));
        setCantors(normalized);

        const rList = recsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreRecording));
        setRecordings(rList);

        const hList = hymnsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreHymn));
        setHymns(hList);
      } catch (err) {
        console.error('Failed to load cantors & library:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [firestore]);

  // Synchronize local catalog copy
  const syncLocalCatalog = async (updatedCantors: FirestoreCantor[]) => {
    try {
      const catalogData = {
        generatedAt: new Date().toISOString(),
        genres: defaultCatalog.genres,
        cantors: updatedCantors,
        hymns: defaultCatalog.hymns,
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

  // Reorder Cantors via Drag and Drop
  const handleCantorDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedCantorIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleCantorDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCantorIdx !== idx) {
      setDragOverCantorIdx(idx);
    }
  };

  const handleCantorDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedCantorIdx === null || draggedCantorIdx === targetIdx) {
      setDraggedCantorIdx(null);
      setDragOverCantorIdx(null);
      return;
    }

    const newCantors = [...cantors];
    const [moved] = newCantors.splice(draggedCantorIdx, 1);
    newCantors.splice(targetIdx, 0, moved);
    const withRanks = newCantors.map((c, i) => ({ ...c, rank: i + 1 }));

    setCantors(withRanks);
    setHasUnsavedOrder(true);
    setDraggedCantorIdx(null);
    setDragOverCantorIdx(null);
  };

  // Typing rank number commits a position change automatically
  const commitRankChange = (cantorId: string, currentIdx: number) => {
    const raw = rankInputs[cantorId];
    if (raw === undefined || raw === '') {
      setRankInputs(prev => {
        const next = { ...prev };
        delete next[cantorId];
        return next;
      });
      return;
    }

    const parsed = parseInt(raw, 10);
    setRankInputs(prev => {
      const next = { ...prev };
      delete next[cantorId];
      return next;
    });

    if (isNaN(parsed) || parsed < 1) return;
    const targetIdx = Math.max(0, Math.min(cantors.length - 1, parsed - 1));
    if (targetIdx === currentIdx) return;

    const newCantors = [...cantors];
    const [moved] = newCantors.splice(currentIdx, 1);
    newCantors.splice(targetIdx, 0, moved);
    const withRanks = newCantors.map((c, i) => ({ ...c, rank: i + 1 }));

    setCantors(withRanks);
    setHasUnsavedOrder(true);
  };

  // Save All Cantor Ranks
  const handleSaveAllOrder = async () => {
    if (!firestore) return;
    try {
      setIsSaving(true);
      await Promise.all(
        cantors.map((c, idx) => {
          const cRef = doc(firestore, 'cantors', c.id);
          return updateDoc(cRef, {
            rank: idx + 1,
            active: c.active !== false,
            updatedAt: serverTimestamp(),
          });
        })
      );

      const withRanks = cantors.map((c, idx) => ({ ...c, rank: idx + 1 }));
      await syncLocalCatalog(withRanks);
      setHasUnsavedOrder(false);

      toast({
        title: 'Cantor Order Saved',
        description: `Successfully ranked ${cantors.length} cantors from #1 to #${cantors.length}.`,
      });
    } catch (err: any) {
      console.error('Failed to save cantor order:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not update cantor ranks.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update a single Cantor document
  const handleUpdateCantor = async (cantor: FirestoreCantor) => {
    if (!firestore) return;
    try {
      setIsSaving(true);
      const cRef = doc(firestore, 'cantors', cantor.id);
      const payload: any = {
        name: cantor.name,
        rank: Number(cantor.rank),
        active: cantor.active !== false,
        cantorCloudActive: cantor.cantorCloudActive !== false,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(cRef, payload);
      await syncLocalCatalog(cantors.map(c => (c.id === cantor.id ? { ...c, ...payload } : c)));

      toast({
        title: 'Cantor Updated',
        description: `Successfully updated ${cantor.name}.`,
      });
    } catch (err: any) {
      console.error('Failed to update cantor:', err);
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not update cantor document.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Create new Cantor
  const handleCreateCantor = async () => {
    if (!firestore || !newId.trim() || !newName.trim()) return;

    const slug = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newRank = cantors.length + 1;

    try {
      setIsCreating(true);
      const cRef = doc(firestore, 'cantors', slug);

      const newCantorData: FirestoreCantor = {
        id: slug,
        name: newName.trim(),
        rank: newRank,
        active: newActive,
        cantorCloudActive: newCloudActive,
      };

      await setDoc(cRef, {
        ...newCantorData,
        updatedAt: serverTimestamp(),
      });

      const updated = [...cantors, newCantorData].map((c, idx) => ({ ...c, rank: idx + 1 }));
      setCantors(updated);
      await syncLocalCatalog(updated);

      setIsOpenNew(false);
      setNewId('');
      setNewName('');
      setNewActive(true);
      setNewCloudActive(true);

      toast({
        title: 'Cantor Added',
        description: `Created cantor profile for ${newName} as #${newRank}.`,
      });
    } catch (err: any) {
      console.error('Creation failed:', err);
      toast({
        title: 'Creation Failed',
        description: err.message || 'Could not create cantor.',
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
        <p className="text-sm text-muted-foreground">Loading Cantors...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Cantors Management</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag rows to reorder cantor ranking in audio selectors. Enable or disable cantors in the app.
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
              <span>Save Cantor Order</span>
            </Button>
          )}

          <Dialog open={isOpenNew} onOpenChange={setIsOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                <Plus className="w-4 h-4" />
                <span>Add Cantor</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-headline">Add New Cantor</DialogTitle>
                <DialogDescription className="text-xs">
                  Creates a new cantor document in Cloud Firestore.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Cantor Name</label>
                  <Input
                    placeholder="e.g. Cantor Ibrahim Ayad"
                    value={newName}
                    onChange={e => {
                      setNewName(e.target.value);
                      if (!newId) {
                        setNewId(
                          e.target.value
                            .toLowerCase()
                            .replace(/^cantor\s*/, 'cantor-')
                            .replace(/\s+/g, '-')
                        );
                      }
                    }}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Unique ID (Slug)</label>
                  <Input
                    placeholder="e.g. cantor-ibrahim"
                    value={newId}
                    onChange={e => setNewId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold">Active in App</label>
                    <p className="text-[11px] text-muted-foreground">
                      Enable this cantor across the app.
                    </p>
                  </div>
                  <Switch checked={newActive} onCheckedChange={setNewActive} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <label className="text-xs font-semibold">CantorCloud Active</label>
                    <p className="text-[11px] text-muted-foreground">
                      Enable for streaming playback in CantorCloud.
                    </p>
                  </div>
                  <Switch checked={newCloudActive} onCheckedChange={setNewCloudActive} />
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
                  onClick={handleCreateCantor}
                  disabled={isCreating || !newName.trim() || !newId.trim()}
                  className="gap-1.5 bg-primary text-primary-foreground"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add Cantor</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cantors Table Card */}
      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-3 w-20 text-center">Rank</th>
                <th className="py-3 px-4">Cantor Name</th>
                <th className="py-3 px-4">Identifier (ID)</th>
                <th className="py-3 px-4">Recordings</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-center">CantorCloud</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cantors.map((c, idx) => {
                const isExpanded = expandedCantorId === c.id;
                const cantorRecordings = recordings.filter(r => r.cantorId === c.id);
                const markedCount = cantorRecordings.filter(
                  r => (r.markers && r.markers.length > 0) || r.mode === 'learn'
                ).length;
                const isDraggingThis = draggedCantorIdx === idx;
                const isDragOver = dragOverCantorIdx === idx;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      draggable
                      onDragStart={e => handleCantorDragStart(e, idx)}
                      onDragOver={e => handleCantorDragOver(e, idx)}
                      onDrop={e => handleCantorDrop(e, idx)}
                      onDragEnd={() => {
                        setDraggedCantorIdx(null);
                        setDragOverCantorIdx(null);
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
                            title="Drag row to reorder cantor"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={rankInputs[c.id] !== undefined ? rankInputs[c.id] : String(idx + 1)}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setRankInputs(prev => ({ ...prev, [c.id]: val }));
                            }}
                            onBlur={() => commitRankChange(c.id, idx)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitRankChange(c.id, idx);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-11 h-7 text-xs font-mono font-bold text-center px-1 py-0 bg-muted/60"
                            title="Type rank number and press Enter to adjust location"
                          />
                        </div>
                      </td>

                      {/* Cantor Name & Expand Toggle */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedCantorId(isExpanded ? null : c.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-transform"
                            title={isExpanded ? 'Collapse recordings' : 'Expand recordings'}
                          >
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform ${
                                isExpanded ? 'transform rotate-90 text-primary' : ''
                              }`}
                            />
                          </button>
                          <Input
                            value={c.name}
                            onChange={e => {
                              const val = e.target.value;
                              setCantors(prev =>
                                prev.map(x => (x.id === c.id ? { ...x, name: val } : x))
                              );
                            }}
                            className="h-8 text-xs font-semibold max-w-xs"
                          />
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
                        {c.id}
                      </td>

                      {/* Recordings Preview / Count */}
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedCantorId(isExpanded ? null : c.id)}
                          className="flex items-center gap-1.5 text-xs text-left group"
                        >
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-colors ${
                              cantorRecordings.length > 0
                                ? 'bg-primary/10 text-primary group-hover:bg-primary/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {cantorRecordings.length}{' '}
                            {cantorRecordings.length === 1 ? 'Track' : 'Tracks'}
                          </span>

                          {markedCount > 0 && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              <span>{markedCount} mapped</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Active Switch */}
                      <td className="py-2.5 px-4 text-center">
                        <Switch
                          checked={c.active !== false}
                          onCheckedChange={val => {
                            setCantors(prev =>
                              prev.map(x => (x.id === c.id ? { ...x, active: val } : x))
                            );
                          }}
                        />
                      </td>

                      {/* CantorCloud Switch */}
                      <td className="py-2.5 px-4 text-center">
                        <Switch
                          checked={c.cantorCloudActive !== false}
                          onCheckedChange={val => {
                            setCantors(prev =>
                              prev.map(x =>
                                x.id === c.id ? { ...x, cantorCloudActive: val } : x
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
                          onClick={() => handleUpdateCantor(c)}
                          disabled={isSaving}
                          className="h-8 text-xs gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </Button>
                      </td>
                    </tr>

                    {/* Expandable Recordings Breakdown Sub-Row */}
                    {isExpanded && (
                      <tr className="bg-muted/15 border-b">
                        <td colSpan={7} className="p-4 pl-10 pr-6">
                          <div className="bg-card rounded-xl border p-4 shadow-xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                              <div>
                                <h3 className="font-semibold text-xs flex items-center gap-2 text-foreground">
                                  <Music className="w-4 h-4 text-primary" />
                                  <span>Audio Recordings by {c.name}</span>
                                  <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    {cantorRecordings.length}{' '}
                                    {cantorRecordings.length === 1 ? 'Track' : 'Tracks'}
                                  </span>
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Green indicator indicates audio markers are aligned for verse-by-verse learning.
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                                  onClick={() => handleUpdateCantor(c)}
                                  disabled={isSaving}
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save Cantor</span>
                                </Button>
                              </div>
                            </div>

                            {/* Recordings List */}
                            {cantorRecordings.length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-lg bg-muted/10">
                                No audio tracks recorded by {c.name} yet.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {cantorRecordings.map(rec => {
                                  const hymn = hymnsMap.get(rec.hymnId);
                                  const markerCount = rec.markers?.length || 0;
                                  const hasMarkers = markerCount > 0 || rec.mode === 'learn';

                                  return (
                                    <div
                                      key={rec.id}
                                      className="p-2.5 rounded-lg border bg-background flex flex-col justify-between gap-2 hover:border-muted-foreground/30 transition-colors"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-semibold text-xs text-foreground truncate">
                                            {hymn?.name || rec.hymnId}
                                          </span>
                                          <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                              hasMarkers
                                                ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                                                : 'bg-muted-foreground/40'
                                            }`}
                                            title={hasMarkers ? `${markerCount} markers mapped` : 'Unmapped'}
                                          />
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                                          <span>{formatDuration(rec.audioLength || 0)}</span>
                                          <span>•</span>
                                          <span>
                                            {hasMarkers ? `${markerCount} markers` : 'No markers'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-1 border-t border-muted/50 text-[10px]">
                                        <span className="text-muted-foreground font-mono truncate max-w-[120px]">
                                          {rec.id}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                          <Button
                                            asChild
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[10px] px-2 gap-1"
                                          >
                                            <Link href={`/hymn/${rec.hymnId}?recordingId=${rec.id}`} target="_blank">
                                              <ExternalLink className="w-2.5 h-2.5" />
                                              <span>Listen</span>
                                            </Link>
                                          </Button>

                                          <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-[10px] px-2 gap-1 text-primary"
                                          >
                                            <Link href={`/admin/markers?recordingId=${rec.id}&hymnId=${rec.hymnId}`}>
                                              <Sliders className="w-2.5 h-2.5" />
                                              <span>Studio</span>
                                            </Link>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
