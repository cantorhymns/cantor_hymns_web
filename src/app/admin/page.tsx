'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Music2,
  Sliders,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  UploadCloud,
  FileAudio,
} from 'lucide-react';
import { FirestoreHymn, FirestoreRecording } from '@/types/admin';
import { formatCantorName } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    hymnsCount: 0,
    hymnsWithCompleteLyrics: 0,
    recordingsCount: 0,
    recordingsWithMarkers: 0,
    cantorsCount: 0,
    genresCount: 0,
  });
  const [recordingsWithoutMarkers, setRecordingsWithoutMarkers] = useState<FirestoreRecording[]>([]);
  const [hymnsList, setHymnsList] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    async function loadStats() {
      if (!firestore) return;
      try {
        setIsLoading(true);

        const [cantorsSnap, genresSnap, hymnsSnap, recsSnap] = await Promise.all([
          getDocs(collection(firestore, 'cantors')),
          getDocs(collection(firestore, 'genres')),
          getDocs(collection(firestore, 'hymns')),
          getDocs(collection(firestore, 'recordings')),
        ]);

        const hymnsMap = new Map<string, string>();
        let completeLyrics = 0;
        hymnsSnap.docs.forEach(d => {
          const h = d.data() as FirestoreHymn;
          hymnsMap.set(d.id, h.name || d.id);
          if (h.lyrics?.coptic && h.lyrics?.english && h.lyrics?.arabic) {
            completeLyrics++;
          }
        });
        setHymnsList(hymnsMap);

        let withMarkers = 0;
        const noMarkers: FirestoreRecording[] = [];
        recsSnap.docs.forEach(d => {
          const r = d.data() as FirestoreRecording;
          if (r.markers && r.markers.length > 0) {
            withMarkers++;
          } else {
            noMarkers.push({ ...r, id: d.id });
          }
        });

        setRecordingsWithoutMarkers(noMarkers);
        setStats({
          hymnsCount: hymnsSnap.size,
          hymnsWithCompleteLyrics: completeLyrics,
          recordingsCount: recsSnap.size,
          recordingsWithMarkers: withMarkers,
          cantorsCount: cantorsSnap.size,
          genresCount: genresSnap.size,
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [firestore]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">
            CantorHymns Studio Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Single Source of Truth: Cloud Firestore & Firebase Storage CDN
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/admin/markers">
              <Sliders className="w-4 h-4" />
              <span>Open Waveform Studio</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Connecting to Firestore collections...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hymns Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Hymns
              </CardTitle>
              <Music2 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stats.hymnsCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{stats.hymnsWithCompleteLyrics} with full 3-language lyrics</span>
              </p>
            </CardContent>
          </Card>

          {/* Recordings Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Audio Recordings
              </CardTitle>
              <FileAudio className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stats.recordingsCount}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{stats.recordingsWithMarkers} aligned with waveform markers</span>
              </p>
            </CardContent>
          </Card>

          {/* Cantors Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cantors
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stats.cantorsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Coptic masters in archive
              </p>
            </CardContent>
          </Card>

          {/* Seasons Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Liturgical Seasons
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stats.genresCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active liturgical seasons
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fast Action Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: Waveform Studio */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Sliders className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Waveform Marker Studio</CardTitle>
            <CardDescription className="text-xs">
              Interactive "Web Audacity" tool with millisecond zoom, keyboard shortcuts (<kbd className="px-1 py-0.5 rounded bg-muted">M</kbd> to drop, <kbd className="px-1 py-0.5 rounded bg-muted">Space</kbd> to play), and verse mapping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
              <Link href="/admin/markers">
                <span>Launch Marker Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module 2: Hymns & Lyrics */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Music2 className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Hymns & Lyrics Manager</CardTitle>
            <CardDescription className="text-xs">
              Manage all hymns and edit synchronized 3-column lyrics (Coptic font, English translation, and Arabic) stored directly in Firestore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
              <Link href="/admin/hymns">
                <span>Manage Hymns</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module 3: Cantors & Seasons */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Cantors & Seasons</CardTitle>
            <CardDescription className="text-xs">
              Add new cantors, update cloud active toggles, adjust display rankings, and organize liturgical subgenres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
              <Link href="/admin/cantors">
                <span>Manage Cantors & Seasons</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Tasks / Recordings Needing Attention */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Recordings Needing Waveform Markers
            </CardTitle>
            <CardDescription className="text-xs">
              {recordingsWithoutMarkers.length === 0
                ? 'All audio tracks currently have aligned markers.'
                : `${recordingsWithoutMarkers.length} recordings need waveform marker placement for the learning engine.`}
            </CardDescription>
          </div>
          {recordingsWithoutMarkers.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Needs Attention
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {recordingsWithoutMarkers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span>Great job! 100% of audio recordings have marker metadata configured.</span>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {recordingsWithoutMarkers.slice(0, 5).map(rec => (
                <div
                  key={rec.id}
                  className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium text-foreground">
                      {hymnsList.get(rec.hymnId) || rec.hymnId}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{formatCantorName(rec.cantorId)}</span>
                      <span>&bull;</span>
                      <span className="text-[10px] font-medium flex items-center gap-1">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            (rec.markers?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          }`}
                        />
                        <span>{(rec.markers?.length || 0) > 0 ? `${rec.markers?.length} Markers` : 'Unmapped'}</span>
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                    <Link href={`/admin/markers?recordingId=${rec.id}`}>
                      <span>Place Markers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
