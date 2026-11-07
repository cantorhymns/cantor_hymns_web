'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { FirestoreRecording, FirestoreHymn } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  ChevronsLeft,
  ChevronsRight,
  Volume2,
  ZoomIn,
  ZoomOut,
  MapPin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Download,
  Upload,
  Save,
  Check,
  Loader2,
  VolumeX,
  FastForward,
  Rewind,
  SkipBack,
  SkipForward,
  Sparkles,
  ExternalLink,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Users,
  GripVertical,
  MessageSquare,
  Unlink,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatTime, exportAudacityLabels, parseAudacityLabels, downloadTextFile } from './audacity-converter';
import { formatCantorName } from '@/lib/utils';

interface WaveformEditorProps {
  recording: FirestoreRecording;
  hymn?: FirestoreHymn;
  audioSrc: string;
  onSave: (markers: number[], lyricsMapping: number[]) => Promise<void>;
  onSaveLyrics?: (hymnId: string, lyrics: { coptic: string; english: string; arabic: string }) => Promise<void>;
  isSaving: boolean;
  hymnRecordings?: FirestoreRecording[];
  cantorsMap?: Map<string, { id: string; name?: string }>;
  onSelectRecording?: (recordingId: string) => void;
}

const REGION_COLORS = [
  'rgba(234, 179, 8, 0.25)',   // amber
  'rgba(99, 102, 241, 0.25)',  // indigo
  'rgba(16, 185, 129, 0.25)',  // emerald
  'rgba(236, 72, 153, 0.25)',  // pink
  'rgba(14, 165, 233, 0.25)',  // sky
  'rgba(168, 85, 247, 0.25)',  // purple
];

export function WaveformEditor({
  recording,
  hymn,
  audioSrc,
  onSave,
  onSaveLyrics,
  isSaving,
  hymnRecordings,
  cantorsMap,
  onSelectRecording,
}: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.audioLength || 0);
  const [zoomLevel, setZoomLevel] = useState(20);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Markers state (in seconds, e.g. [0.0, 14.25, 28.5])
  const [markers, setMarkers] = useState<number[]>(recording.markers || []);
  const [lyricsMapping, setLyricsMapping] = useState<number[]>(recording.lyricsMapping || []);
  const [selectedMarkerIdx, setSelectedMarkerIdx] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state if recording changes or gets enriched
  useEffect(() => {
    setMarkers(recording.markers || []);
    setLyricsMapping(recording.lyricsMapping || []);
  }, [recording.id, recording.markers, recording.lyricsMapping]);

  // Drag-and-drop state for bidirectional marker <-> verse binding
  const [draggedItem, setDraggedItem] = useState<{
    type: 'marker' | 'verse';
    markerNum?: number; // 0 for Track Start, 1..N for marker 1..N
    markerIdx?: number;
    verseIdx?: number;
  } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // In-studio lyrics editing state
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [editCoptic, setEditCoptic] = useState(hymn?.lyrics?.coptic || '');
  const [editEnglish, setEditEnglish] = useState(hymn?.lyrics?.english || '');
  const [editArabic, setEditArabic] = useState(hymn?.lyrics?.arabic || '');
  const [isSavingLyrics, setIsSavingLyrics] = useState(false);

  useEffect(() => {
    setEditCoptic(hymn?.lyrics?.coptic || '');
    setEditEnglish(hymn?.lyrics?.english || '');
    setEditArabic(hymn?.lyrics?.arabic || '');
  }, [hymn]);

  const copticLineCount = useMemo(
    () => editCoptic.split(/\r?\n/).filter(l => l.trim().length > 0).length,
    [editCoptic]
  );
  const englishLineCount = useMemo(
    () => editEnglish.split(/\r?\n/).filter(l => l.trim().length > 0).length,
    [editEnglish]
  );
  const arabicLineCount = useMemo(
    () => editArabic.split(/\r?\n/).filter(l => l.trim().length > 0).length,
    [editArabic]
  );

  const areLinesAligned =
    copticLineCount === englishLineCount && englishLineCount === arabicLineCount && copticLineCount > 0;

  const handleSaveLyricsModal = async () => {
    if (!hymn?.id || !onSaveLyrics) return;
    try {
      setIsSavingLyrics(true);
      await onSaveLyrics(hymn.id, {
        coptic: editCoptic,
        english: editEnglish,
        arabic: editArabic,
      });
      setIsLyricsModalOpen(false);
    } catch (err) {
      // Handled in parent
    } finally {
      setIsSavingLyrics(false);
    }
  };

  // Playback & seeking tracking refs so async events and seek callbacks always have fresh state
  const isPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const markersRef = useRef(markers);
  const jumpToMarkerRef = useRef<(idx: number, forcePlay?: boolean) => void>(() => {});

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // Parse hymn lyrics into verses
  const verses = useMemo(() => {
    if (!hymn?.lyrics) return [];
    const copticLines = (hymn.lyrics.coptic || '').split(/\r?\n/).filter(l => l.trim().length > 0);
    const englishLines = (hymn.lyrics.english || '').split(/\r?\n/).filter(l => l.trim().length > 0);
    const arabicLines = (hymn.lyrics.arabic || '').split(/\r?\n/).filter(l => l.trim().length > 0);

    const maxLines = Math.max(copticLines.length, englishLines.length, arabicLines.length);
    const items = [];
    for (let i = 0; i < maxLines; i++) {
      items.push({
        index: i,
        coptic: copticLines[i] || '',
        english: englishLines[i] || '',
        arabic: arabicLines[i] || '',
      });
    }
    return items;
  }, [hymn]);

  // Count of verses mapped to either Track Start (0) or a marker (> 0)
  const mappedCount = useMemo(
    () => verses.filter(v => lyricsMapping[v.index] !== undefined && lyricsMapping[v.index] >= 0).length,
    [verses, lyricsMapping]
  );

  // Get mapped marker for a verse (returns 0 for track start, > 0 for marker number, null for unmapped)
  const getMappedMarkerForVerse = useCallback(
    (verseIdx: number): { markerNum: number; time: number; label: string } | null => {
      // 1. CantorHymns standard format: lyricsMapping[verseIdx] = markerNum (0: track start 0.0s, 1..N: marker 1..N)
      if (lyricsMapping[verseIdx] !== undefined && lyricsMapping[verseIdx] >= 0) {
        const mNum = lyricsMapping[verseIdx];
        if (mNum === 0) {
          return { markerNum: 0, time: 0, label: 'Track Start (00:00.00)' };
        }
        if (mNum > 0 && mNum <= markers.length) {
          return {
            markerNum: mNum,
            time: markers[mNum - 1],
            label: `Marker #${mNum} (${formatTime(markers[mNum - 1])})`,
          };
        }
      }
      // 2. Fallback marker-indexed format: lyricsMapping[markerIdx] === verseIdx
      const mIdx = lyricsMapping.indexOf(verseIdx);
      if (mIdx >= 0 && mIdx < markers.length) {
        return {
          markerNum: mIdx + 1,
          time: markers[mIdx],
          label: `Marker #${mIdx + 1} (${formatTime(markers[mIdx])})`,
        };
      }
      return null;
    },
    [lyricsMapping, markers]
  );

  // Get mapped verse for a marker (0-indexed markerIdx, i.e. Marker #markerIdx + 1)
  const getMappedVerseForMarker = useCallback(
    (markerIdx: number): { verseIdx: number; label: string } | null => {
      const markerNum = markerIdx + 1;
      for (let v = 0; v < verses.length; v++) {
        const val = lyricsMapping[v];
        if (val === markerNum || (markerIdx === 0 && markers[0] <= 0.05 && val === 0)) {
          return { verseIdx: v, label: `Verse #${v + 1}` };
        }
      }
      // Fallback marker-indexed format: lyricsMapping[markerIdx] === verseIdx
      if (
        lyricsMapping[markerIdx] !== undefined &&
        lyricsMapping[markerIdx] >= 0 &&
        lyricsMapping[markerIdx] < verses.length
      ) {
        const v = lyricsMapping[markerIdx];
        return { verseIdx: v, label: `Verse #${v + 1}` };
      }
      return null;
    },
    [lyricsMapping, markers, verses.length]
  );

  // Synchronize regions on wavesurfer
  const syncRegions = useCallback((markerList: number[], selectedIdx: number | null) => {
    const plugin = regionsPluginRef.current;
    if (!plugin) return;

    const existingRegions = plugin.getRegions ? plugin.getRegions() : [];
    // Fast path: if regions already exist and match marker count, update visual selection without clearing DOM
    if (existingRegions.length === markerList.length && existingRegions.length > 0) {
      for (let i = 0; i < existingRegions.length; i++) {
        const r = existingRegions[i];
        const isSelected = selectedIdx === i;
        if (r.element) {
          r.element.style.pointerEvents = 'none';
          r.element.style.borderLeft = isSelected
            ? '3px solid #ef4444'
            : '2px solid #f59e0b';
          r.element.style.boxShadow = isSelected
            ? '-2px 0 10px rgba(239, 68, 68, 0.8)'
            : '-1px 0 6px rgba(245, 158, 11, 0.5)';
          r.element.style.backgroundColor = isSelected
            ? 'rgba(239, 68, 68, 0.12)'
            : i % 2 === 0
            ? 'rgba(245, 158, 11, 0.04)'
            : 'rgba(99, 102, 241, 0.04)';

          const mappedVerse = getMappedVerseForMarker(i);
          const vText = mappedVerse ? ` • ${mappedVerse.label.replace('Verse ', 'V')}` : '';

          const pill = r.element.querySelector('[data-marker-pill]') as HTMLElement | null;
          if (pill) {
            pill.style.background = isSelected ? '#ef4444' : '#f59e0b';
            pill.style.color = isSelected ? '#ffffff' : '#0f172a';
            pill.innerText = `#${i + 1}${vText}`;
          }
          const arrow = r.element.querySelector('[data-marker-arrow]') as HTMLElement | null;
          if (arrow) {
            arrow.style.borderTop = `4px solid ${isSelected ? '#ef4444' : '#f59e0b'}`;
          }
        }
      }
      return;
    }

    plugin.clearRegions();

    if (markerList.length === 0) return;

    for (let i = 0; i < markerList.length; i++) {
      const start = markerList[i];
      const end = i + 1 < markerList.length ? markerList[i + 1] : Math.max(start + 1, duration);
      const isSelected = selectedIdx === i;
      const mappedVerse = getMappedVerseForMarker(i);
      const vText = mappedVerse ? ` • ${mappedVerse.label.replace('Verse ', 'V')}` : '';

      // Create a prominent marker pin & flag
      const flagContainer = document.createElement('div');
      flagContainer.style.position = 'absolute';
      flagContainer.style.top = '1px';
      flagContainer.style.left = '0px';
      flagContainer.style.transform = 'translateX(-50%)';
      flagContainer.style.pointerEvents = 'auto';
      flagContainer.style.cursor = 'pointer';
      flagContainer.style.zIndex = '30';
      flagContainer.style.display = 'flex';
      flagContainer.style.flexDirection = 'column';
      flagContainer.style.alignItems = 'center';
      flagContainer.title = `Jump to Marker #${i + 1} (${formatTime(start)})${mappedVerse ? ` • ${mappedVerse.label}` : ''}`;

      const pill = document.createElement('div');
      pill.setAttribute('data-marker-pill', 'true');
      pill.style.background = isSelected ? '#ef4444' : '#f59e0b';
      pill.style.color = isSelected ? '#ffffff' : '#0f172a';
      pill.style.fontSize = '10px';
      pill.style.fontWeight = '800';
      pill.style.padding = '1px 5px';
      pill.style.borderRadius = '3px';
      pill.style.boxShadow = '0 2px 5px rgba(0,0,0,0.7)';
      pill.style.whiteSpace = 'nowrap';
      pill.style.letterSpacing = '-0.02em';
      pill.style.lineHeight = '1.2';
      pill.innerText = `#${i + 1}${vText}`;

      const arrow = document.createElement('div');
      arrow.setAttribute('data-marker-arrow', 'true');
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '3px solid transparent';
      arrow.style.borderRight = '3px solid transparent';
      arrow.style.borderTop = `4px solid ${isSelected ? '#ef4444' : '#f59e0b'}`;

      flagContainer.appendChild(pill);
      flagContainer.appendChild(arrow);

      const markerIdx = i;
      flagContainer.onclick = (e) => {
        e.stopPropagation();
        jumpToMarkerRef.current(markerIdx);
      };

      const r = plugin.addRegion({
        id: `marker-${i}`,
        start,
        end,
        content: flagContainer,
        color: isSelected
          ? 'rgba(239, 68, 68, 0.12)'
          : i % 2 === 0
          ? 'rgba(245, 158, 11, 0.04)'
          : 'rgba(99, 102, 241, 0.04)',
        drag: false, // Prevents dragging whole region when clicking track
        resize: true, // Allows dragging the marker line to adjust its timestamp
      });

      if (r.element) {
        // Shaded region body has pointer-events: none so clicks pass directly to WaveSurfer for seeking
        r.element.style.pointerEvents = 'none';
        // High-contrast, sharp vertical line directly on the marker timestamp
        r.element.style.borderLeft = isSelected
          ? '3px solid #ef4444'
          : '2px solid #f59e0b';
        r.element.style.boxShadow = isSelected
          ? '-2px 0 10px rgba(239, 68, 68, 0.8)'
          : '-1px 0 6px rgba(245, 158, 11, 0.5)';

        // Left resize handle: enable dragging the marker line to nudge its timestamp
        const leftHandle = r.element.querySelector('[part~="region-handle-left"]') as HTMLElement | null;
        if (leftHandle) {
          leftHandle.style.pointerEvents = 'auto';
          leftHandle.style.width = '14px';
          leftHandle.style.left = '-7px';
          leftHandle.style.cursor = 'col-resize';
          leftHandle.style.zIndex = '25';
        }

        // Right resize handle: hide so contiguous regions don't overlap resize handles
        const rightHandle = r.element.querySelector('[part~="region-handle-right"]') as HTMLElement | null;
        if (rightHandle) {
          rightHandle.style.display = 'none';
        }
      }
    }
  }, [duration, getMappedVerseForMarker]);

  const getScrollContainer = (ws: WaveSurfer | null): HTMLElement | null => {
    if (!ws) return null;
    try {
      const wrapper = ws.getWrapper();
      if (!wrapper) return null;
      if (wrapper.parentElement && wrapper.parentElement.classList.contains('scroll')) {
        return wrapper.parentElement;
      }
      const host = containerRef.current?.firstElementChild as HTMLElement | null;
      if (host?.shadowRoot) {
        const sc = host.shadowRoot.querySelector('.scroll') as HTMLElement | null;
        if (sc) return sc;
      }
      return wrapper.parentElement || wrapper;
    } catch {
      return null;
    }
  };

  const syncScrollToCenter = useCallback((time: number) => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    const dur = ws.getDuration() || duration;
    if (dur <= 0) return;
    const sc = getScrollContainer(ws);
    if (!sc) return;

    const wrapper = ws.getWrapper();
    const canvasWidth = wrapper ? wrapper.scrollWidth : Math.max(1, sc.scrollWidth - sc.clientWidth);
    const targetScrollLeft = (time / dur) * canvasWidth;
    sc.scrollLeft = targetScrollLeft;
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = targetScrollLeft;
    }
  }, [duration]);

  const isScrubbingRef = useRef(false);
  const scrubStartRef = useRef<{
    x: number;
    time: number;
    wasPlaying: boolean;
    hasMoved: boolean;
  } | null>(null);

  const handleScrubStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const ws = wavesurferRef.current;
    if (!ws || !isAudioReady || duration <= 0) return;

    // If click originated on a marker pill or resize handle, let region handler handle it
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-marker-pill]') ||
      target.closest('[data-marker-arrow]') ||
      target.closest('[part~="region-handle-left"]') ||
      target.closest('.wavesurfer-handle-start')
    ) {
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const wasPlaying = isPlayingRef.current || ws.isPlaying();
    if (wasPlaying) {
      ws.pause();
    }

    isScrubbingRef.current = true;
    isSeekingRef.current = true;
    scrubStartRef.current = {
      x: clientX,
      time: ws.getCurrentTime(),
      wasPlaying,
      hasMoved: false,
    };
  }, [isAudioReady, duration]);

  const handleScrubMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isScrubbingRef.current || !scrubStartRef.current) return;
    const ws = wavesurferRef.current;
    if (!ws) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - scrubStartRef.current.x;

    if (Math.abs(deltaX) > 2) {
      scrubStartRef.current.hasMoved = true;
    }

    const sc = getScrollContainer(ws);
    const wrapper = ws.getWrapper();
    const canvasWidth = wrapper ? wrapper.scrollWidth : (sc ? sc.scrollWidth - sc.clientWidth : 1000);
    const pxPerSec = canvasWidth / Math.max(1, duration);

    // Scrubbing left (deltaX < 0) advances audio forward
    // Scrubbing right (deltaX > 0) rewinds audio backward
    const timeChange = -deltaX / Math.max(0.001, pxPerSec);
    const newTime = Math.max(0, Math.min(duration, scrubStartRef.current.time + timeChange));

    ws.setTime(newTime);
    setCurrentTime(newTime);
    syncScrollToCenter(newTime);

    if (markersRef.current.length > 0) {
      for (let i = markersRef.current.length - 1; i >= 0; i--) {
        if (newTime >= markersRef.current[i]) {
          setSelectedMarkerIdx(i);
          break;
        }
      }
    }
  }, [duration, syncScrollToCenter]);

  const handleScrubEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isScrubbingRef.current) return;
    const ws = wavesurferRef.current;
    const scrubInfo = scrubStartRef.current;

    isScrubbingRef.current = false;
    scrubStartRef.current = null;

    if (!ws || !scrubInfo) return;

    // Single-click / tap jump directly to needle
    if (!scrubInfo.hasMoved && containerRef.current) {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const rect = containerRef.current.getBoundingClientRect();
      const clickXInContainer = clientX - rect.left;
      const centerOffset = clickXInContainer - rect.width / 2;

      const sc = getScrollContainer(ws);
      const wrapper = ws.getWrapper();
      const canvasWidth = wrapper ? wrapper.scrollWidth : (sc ? sc.scrollWidth - sc.clientWidth : 1000);
      const pxPerSec = canvasWidth / Math.max(1, duration);

      const timeOffset = centerOffset / Math.max(0.001, pxPerSec);
      const targetTime = Math.max(0, Math.min(duration, scrubInfo.time + timeOffset));

      ws.setTime(targetTime);
      setCurrentTime(targetTime);
      syncScrollToCenter(targetTime);
    }

    if (scrubInfo.wasPlaying) {
      ws.play()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            isSeekingRef.current = false;
          }, 150);
        });
    } else {
      isSeekingRef.current = false;
    }
  }, [duration, syncScrollToCenter]);

  useEffect(() => {
    window.addEventListener('mousemove', handleScrubMove);
    window.addEventListener('touchmove', handleScrubMove);
    window.addEventListener('mouseup', handleScrubEnd);
    window.addEventListener('touchend', handleScrubEnd);

    return () => {
      window.removeEventListener('mousemove', handleScrubMove);
      window.removeEventListener('touchmove', handleScrubMove);
      window.removeEventListener('mouseup', handleScrubEnd);
      window.removeEventListener('touchend', handleScrubEnd);
    };
  }, [handleScrubMove, handleScrubEnd]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioSrc) return;

    // Destroy existing instance if any
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    const timelinePlugin = TimelinePlugin.create({
      container: timelineRef.current || undefined,
      height: 20,
      timeInterval: 5,
      primaryLabelInterval: 10,
    });

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#64748b',
      progressColor: '#eab308',
      cursorColor: 'transparent',
      cursorWidth: 0,
      height: 130,
      minPxPerSec: zoomLevel,
      plugins: [regionsPlugin, timelinePlugin],
      url: audioSrc,
      dragToSeek: false,
      interact: false,
      autoCenter: false,
    });

    wavesurferRef.current = ws;

    setIsAudioReady(false);

    ws.on('ready', () => {
      setIsAudioReady(true);
      const audioDur = ws.getDuration();
      setDuration(audioDur);
      syncRegions(markersRef.current, selectedMarkerIdx);
      setTimeout(() => {
        syncScrollToCenter(ws.getCurrentTime() || 0);
      }, 50);
    });

    ws.on('timeupdate', (time) => {
      setCurrentTime(time);
      syncScrollToCenter(time);
    });

    ws.on('play', () => {
      isPlayingRef.current = true;
      setIsPlaying(true);
    });

    ws.on('pause', () => {
      // Ignore transient pause events fired during seeking if audio was actively playing
      if (isSeekingRef.current) return;
      isPlayingRef.current = false;
      setIsPlaying(false);
    });

    ws.on('finish', () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    });

    // Handle region clicks (fallback if region intercepts click)
    regionsPlugin.on('region-clicked', (region: Region, e: MouseEvent) => {
      e.stopPropagation();
      const idx = parseInt(region.id.replace('marker-', ''), 10);
      if (!isNaN(idx)) {
        jumpToMarkerRef.current(idx);
      }
    });

    regionsPlugin.on('region-updated', (region: Region) => {
      const idx = parseInt(region.id.replace('marker-', ''), 10);
      if (!isNaN(idx)) {
        setMarkers(prev => {
          const next = [...prev];
          next[idx] = Math.round(region.start * 1000) / 1000;
          next.sort((a, b) => a - b);
          setHasUnsavedChanges(true);
          return next;
        });
      }
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioSrc, syncScrollToCenter]);

  // Sync regions when markers list or selection changes
  useEffect(() => {
    syncRegions(markers, selectedMarkerIdx);
  }, [markers, selectedMarkerIdx, syncRegions]);

  // Handle zoom changes safely after audio is ready
  useEffect(() => {
    if (wavesurferRef.current && isAudioReady) {
      try {
        wavesurferRef.current.zoom(zoomLevel);
        syncScrollToCenter(currentTime);
      } catch (err) {
        // Audio might still be processing
      }
    }
  }, [zoomLevel, isAudioReady, currentTime, syncScrollToCenter]);

  // Handle playback rate changes safely after audio is ready
  useEffect(() => {
    if (wavesurferRef.current && isAudioReady) {
      try {
        wavesurferRef.current.setPlaybackRate(playbackRate);
      } catch (err) {
        // Ignore
      }
    }
  }, [playbackRate, isAudioReady]);

  // Handle loop playback
  useEffect(() => {
    if (!isLooping || selectedMarkerIdx === null || !wavesurferRef.current) return;
    const start = markers[selectedMarkerIdx];
    const end = selectedMarkerIdx + 1 < markers.length ? markers[selectedMarkerIdx + 1] : duration;

    if (currentTime >= end - 0.05) {
      wavesurferRef.current.setTime(start);
      wavesurferRef.current.play();
    }
  }, [currentTime, isLooping, selectedMarkerIdx, markers, duration]);

  // Actions
  const togglePlay = useCallback(() => {
    if (!wavesurferRef.current || !isAudioReady) return;
    wavesurferRef.current.playPause();
  }, [isAudioReady]);

  const seekRelative = useCallback((delta: number) => {
    if (!wavesurferRef.current || !isAudioReady) return;
    const wasPlaying = isPlayingRef.current || wavesurferRef.current.isPlaying();
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    wavesurferRef.current.setTime(newTime);
    if (wasPlaying) {
      isSeekingRef.current = true;
      wavesurferRef.current.play()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            isSeekingRef.current = false;
          }, 150);
        });
    }
  }, [currentTime, duration, isAudioReady]);

  // Drop Marker at current playhead position
  const dropMarkerAtCurrentTime = useCallback(() => {
    const rawTime = Math.round(currentTime * 1000) / 1000;

    // Don't add if a marker exists within 0.05 seconds
    const exists = markers.some(m => Math.abs(m - rawTime) < 0.05);
    if (exists) return;

    const nextMarkers = [...markers, rawTime].sort((a, b) => a - b);
    const newIdx = nextMarkers.indexOf(rawTime);

    // Adjust lyricsMapping: shift any verse mapped to a marker >= newIdx + 1 by +1
    setLyricsMapping(prev => prev.map(mNum => (mNum >= newIdx + 1 ? mNum + 1 : mNum)));

    setMarkers(nextMarkers);
    setSelectedMarkerIdx(newIdx);
    setHasUnsavedChanges(true);
  }, [currentTime, markers]);

  // Nudge selected marker by milliseconds
  const nudgeMarker = useCallback((deltaMs: number) => {
    if (selectedMarkerIdx === null) return;
    setMarkers(prev => {
      const next = [...prev];
      const newTime = Math.max(0, Math.min(duration, next[selectedMarkerIdx] + deltaMs / 1000));
      next[selectedMarkerIdx] = Math.round(newTime * 1000) / 1000;
      next.sort((a, b) => a - b);
      const updatedIdx = next.indexOf(next[selectedMarkerIdx]);
      setSelectedMarkerIdx(updatedIdx);
      setHasUnsavedChanges(true);
      return next;
    });
  }, [selectedMarkerIdx, duration]);

  // Delete selected marker
  const deleteMarker = useCallback((idx: number) => {
    setMarkers(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setHasUnsavedChanges(true);
      return next;
    });
    const targetMarkerNum = idx + 1;
    setLyricsMapping(prev =>
      prev.map(mNum => {
        if (mNum === targetMarkerNum) return -1;
        if (mNum > targetMarkerNum) return mNum - 1;
        return mNum;
      })
    );
    setSelectedMarkerIdx(null);
  }, []);

  // Jump to specific marker (keeps current play/pause state unless forcePlay is true)
  const jumpToMarker = useCallback((idx: number, forcePlay = false) => {
    if (!wavesurferRef.current || !isAudioReady || idx < 0 || idx >= markers.length) return;
    setSelectedMarkerIdx(idx);
    const wasPlaying = isPlayingRef.current || wavesurferRef.current.isPlaying();
    wavesurferRef.current.setTime(markers[idx]);
    if (forcePlay || wasPlaying) {
      isSeekingRef.current = true;
      wavesurferRef.current.play()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => {
            isSeekingRef.current = false;
          }, 150);
        });
    }
  }, [markers, isAudioReady]);

  useEffect(() => {
    jumpToMarkerRef.current = jumpToMarker;
  }, [jumpToMarker]);

  // Jump to Previous Marker (with 2-second buffer rule matching hymn-player)
  const jumpToPrevMarker = useCallback(() => {
    if (!wavesurferRef.current || !isAudioReady) return;

    const REWIND_THRESHOLD = 2.0; // 2-second rule matching hymn-player
    const audioTime = currentTime;

    // Helper to rewind cleanly to the beginning of the audio track
    const rewindToStart = () => {
      const ws = wavesurferRef.current;
      if (!ws) return;
      const zeroMarkerIdx = markers.findIndex(m => m <= 0.05);
      setSelectedMarkerIdx(zeroMarkerIdx >= 0 ? zeroMarkerIdx : null);
      const wasPlaying = isPlayingRef.current || ws.isPlaying();
      ws.setTime(0);
      if (wasPlaying) {
        isSeekingRef.current = true;
        ws.play()
          .catch(() => {})
          .finally(() => {
            setTimeout(() => {
              isSeekingRef.current = false;
            }, 150);
          });
      }
    };

    if (markers.length === 0) {
      rewindToStart();
      return;
    }

    const reversedMarks = [...markers].reverse();
    const currentSectionStartMarker = reversedMarks.find(mark => mark <= audioTime);

    if (currentSectionStartMarker === undefined) {
      rewindToStart();
      return;
    }

    if (audioTime > currentSectionStartMarker + REWIND_THRESHOLD) {
      // More than 2 seconds into current section -> go to start of this section
      const currentIdx = markers.indexOf(currentSectionStartMarker);
      jumpToMarker(currentIdx);
    } else {
      // Within 2 seconds of start of current section -> jump to previous section!
      const currentMarkerIndex = reversedMarks.indexOf(currentSectionStartMarker);
      const previousSectionStartMarker = reversedMarks[currentMarkerIndex + 1];

      if (previousSectionStartMarker !== undefined) {
        const prevIdx = markers.indexOf(previousSectionStartMarker);
        jumpToMarker(prevIdx);
      } else {
        // No previous marker exists -> rewind to beginning of track (0.0s)
        rewindToStart();
      }
    }
  }, [markers, currentTime, isAudioReady, jumpToMarker]);

  // Jump to Next Marker
  const jumpToNextMarker = useCallback(() => {
    if (markers.length === 0 || !wavesurferRef.current || !isAudioReady) return;
    const audioTime = currentTime;
    const nextMark = markers.find(mark => mark > audioTime + 0.3);
    if (nextMark !== undefined) {
      const nextIdx = markers.indexOf(nextMark);
      jumpToMarker(nextIdx);
    } else {
      wavesurferRef.current.setTime(duration);
    }
  }, [markers, currentTime, duration, isAudioReady, jumpToMarker]);

  // Auto-map sequential verses
  const autoMapSequentially = useCallback(() => {
    const nextMapping = verses.map((_, i) => (i < markers.length ? i + 1 : -1));
    setLyricsMapping(nextMapping);
    setHasUnsavedChanges(true);
  }, [verses.length, markers.length]);

  /**
   * Binds a verse to a target marker (targetMarkerNum: 0 for Track Start, 1..N for markers 1..N).
   * Reflects this binding with a comment on the marker and marks unsaved changes.
   */
  const bindVerseToMarker = useCallback((verseIdx: number, targetMarkerNum: number) => {
    setLyricsMapping(prev => {
      const next = [...prev];
      while (next.length <= verseIdx) {
        next.push(-1);
      }
      next[verseIdx] = targetMarkerNum;
      return next;
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Unbinds a single verse so it becomes unmapped.
   */
  const unbindVerse = useCallback((verseIdx: number) => {
    setLyricsMapping(prev => {
      if (verseIdx >= prev.length) return prev;
      const next = [...prev];
      next[verseIdx] = -1;
      return next;
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Unbinds all verses associated with a marker (or Track Start).
   */
  const unbindMarker = useCallback((targetMarkerNum: number) => {
    setLyricsMapping(prev => {
      const next = prev.map(mNum => (mNum === targetMarkerNum ? -1 : mNum));
      return next;
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Clicking a verse in the lyrics panel moves the track to that verse's mapped marker.
   */
  const handleVerseClick = useCallback((verseIdx: number) => {
    const mappedMarker = getMappedMarkerForVerse(verseIdx);
    if (!mappedMarker) return;

    if (mappedMarker.markerNum === 0) {
      if (wavesurferRef.current) {
        wavesurferRef.current.setTime(0);
      }
      setCurrentTime(0);
      setSelectedMarkerIdx(null);
    } else {
      const mIdx = mappedMarker.markerNum - 1;
      jumpToMarker(mIdx, false);
    }
  }, [getMappedMarkerForVerse, jumpToMarker]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        dropMarkerAtCurrentTime();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        setIsLooping(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          seekRelative(-10);
        } else if (markers.length > 0) {
          jumpToPrevMarker();
        } else {
          seekRelative(-10);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          seekRelative(10);
        } else if (markers.length > 0) {
          jumpToNextMarker();
        } else {
          seekRelative(10);
        }
      } else if (e.code === 'BracketLeft') {
        e.preventDefault();
        jumpToPrevMarker();
      } else if (e.code === 'BracketRight') {
        e.preventDefault();
        jumpToNextMarker();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedMarkerIdx !== null) {
          e.preventDefault();
          deleteMarker(selectedMarkerIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, dropMarkerAtCurrentTime, seekRelative, jumpToPrevMarker, jumpToNextMarker, deleteMarker, selectedMarkerIdx, markers.length]);

  // Audacity File Import
  const handleImportAudacity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { markers: parsed } = parseAudacityLabels(text);
      if (parsed.length > 0) {
        setMarkers(parsed);
        setLyricsMapping(verses.map((_, i) => (i < parsed.length ? i + 1 : -1)));
        setSelectedMarkerIdx(0);
        setHasUnsavedChanges(true);
      }
    };
    reader.readAsText(file);
  };

  // Audacity File Export with mapped verse comments reflected
  const handleExportAudacity = () => {
    const labels = markers.map((_, i) => {
      const mappedVerse = getMappedVerseForMarker(i);
      if (mappedVerse) {
        const v = verses[mappedVerse.verseIdx];
        const text = v ? (v.coptic || v.english || v.arabic || '').replace(/[\t\r\n]+/g, ' ') : '';
        return `${mappedVerse.label}${text ? `: ${text.slice(0, 45)}` : ''}`;
      }
      return `${i + 1}`;
    });
    const content = exportAudacityLabels(markers, duration, labels);
    const filename = `${recording.id}_audacity_markers.txt`;
    downloadTextFile(filename, content);
  };

  // Active marker / verse detection for live highlight
  const activeMarkerIdx = useMemo(() => {
    if (markers.length === 0) return null;
    for (let i = markers.length - 1; i >= 0; i--) {
      if (currentTime >= markers[i]) {
        return i;
      }
    }
    return null;
  }, [currentTime, markers]);

  const activeVerseIdx = useMemo(() => {
    if (verses.length === 0) return null;
    let bestVerseIndex = -1;
    let maxStartTime = -1;

    for (let v = 0; v < verses.length; v++) {
      const mappedValue = lyricsMapping[v];
      if (mappedValue === undefined || mappedValue === -1) {
        continue;
      }

      const startTime = mappedValue === 0 ? 0 : (markers[mappedValue - 1] ?? -1);

      if (startTime !== -1 && currentTime >= startTime) {
        if (startTime >= maxStartTime) {
          maxStartTime = startTime;
          bestVerseIndex = v;
        }
      }
    }
    return bestVerseIndex >= 0 ? bestVerseIndex : null;
  }, [verses.length, lyricsMapping, markers, currentTime]);

  return (
    <div className="space-y-6">
      {/* Top Studio Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-sm">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold font-headline tracking-tight">
              {hymn?.name || recording.hymnId}
            </h2>
            {markers.length > 0 ? (
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{markers.length} Markers</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                <span>No markers yet</span>
              </Badge>
            )}

            {/* Cantor Selector Dropdown (Allows switching to same hymn by another cantor) */}
            {hymnRecordings && hymnRecordings.length > 0 && onSelectRecording ? (
              <Select
                value={recording.id}
                onValueChange={val => {
                  if (val !== recording.id) {
                    onSelectRecording(val);
                  }
                }}
              >
                <SelectTrigger className="h-7 w-fit shrink-0 inline-flex items-center text-xs font-medium px-2.5 bg-secondary/80 hover:bg-secondary border-secondary text-secondary-foreground gap-2 shadow-none rounded-md">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold">{formatCantorName(recording.cantorId, cantorsMap)}</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      ({hymnRecordings.length} {hymnRecordings.length === 1 ? 'cantor' : 'cantors'})
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[260px]">
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b mb-1 flex items-center justify-between">
                    <span>Cantors for this Hymn</span>
                    <span className="font-mono text-[9px] lowercase">({hymnRecordings.length})</span>
                  </div>
                  {hymnRecordings.map(r => {
                    const cName = formatCantorName(r.cantorId, cantorsMap);
                    const markerCount = r.markers?.length || 0;
                    const isCurrent = r.id === recording.id;
                    return (
                      <SelectItem key={r.id} value={r.id} className="text-xs py-2 cursor-pointer">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                markerCount > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                              }`}
                            />
                            <span className={isCurrent ? "font-bold text-primary" : "font-medium"}>
                              {cName}
                            </span>
                          </div>
                          {markerCount > 0 ? (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {markerCount} mk
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60">
                              0 mk
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                  {hymnRecordings.length === 1 && (
                    <div className="px-2 pt-2 pb-1 border-t mt-1 text-[11px] text-muted-foreground">
                      <p className="italic">No other cantors recorded for this hymn yet.</p>
                      {hymn?.id && (
                        <Link
                          href={`/admin/hymns?hymnId=${hymn.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium mt-1"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Add recording in Hymn Settings</span>
                        </Link>
                      )}
                    </div>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="text-xs font-medium flex items-center gap-1.5">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span>{formatCantorName(recording.cantorId, cantorsMap)}</span>
              </Badge>
            )}

            {/* Direct navigation to public hymn page & lyrics editing */}
            {hymn?.id && (
              <div className="flex items-center gap-1.5 ml-1">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-7 px-2.5 text-xs gap-1.5 hover:text-primary hover:border-primary/50"
                  title="Open live hymn player page in current environment"
                >
                  <Link href={`/hymn/${hymn.id}`} target="_blank">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    <span>View Hymn</span>
                  </Link>
                </Button>

                {onSaveLyrics && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLyricsModalOpen(true)}
                    className="h-7 px-2.5 text-xs gap-1.5 hover:text-primary hover:border-primary/50"
                    title="Edit Coptic, English, and Arabic lyrics in studio"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Edit Lyrics</span>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title="Open in Hymns & Lyrics Manager"
                >
                  <Link href={`/admin/hymns?hymnId=${hymn.id}`} target="_blank">
                    <Sliders className="w-3 h-3" />
                    <span>Hymn Settings</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Duration: {formatTime(duration)}</span>
            <span>&bull;</span>
            <span className="font-semibold text-primary">{markers.length} Markers</span>
            {hasUnsavedChanges && (
              <>
                <span>&bull;</span>
                <span className="text-amber-500 font-medium">Unsaved changes</span>
              </>
            )}
          </p>
        </div>

        {/* Cloud Save & Audacity Export / Import */}
        <div className="flex items-center gap-2">
          {/* Audacity Import */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleImportAudacity}
            />
            <Button size="sm" variant="outline" asChild className="text-xs gap-1.5 cursor-pointer">
              <span>
                <Upload className="w-3.5 h-3.5" />
                Import Audacity (.txt)
              </span>
            </Button>
          </label>

          {/* Audacity Export */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportAudacity}
            disabled={markers.length === 0}
            className="text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export (.txt)
          </Button>

          {/* Save to Cloud */}
          <Button
            size="sm"
            onClick={() => onSave(markers, lyricsMapping)}
            disabled={isSaving}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving to Cloud...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Markers to Cloud
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Waveform & Timeline Canvas */}
      <Card className="shadow-md border-primary/20 overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Waveform Canvas with Stationary Center Playhead Line */}
          <div
            className="relative rounded-lg bg-slate-950 p-2 border border-slate-800 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
          >
            {/* Stationary Center Playhead Line (Pinned at 50% viewport width) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-rose-500 z-30 pointer-events-none transform -translate-x-1/2 shadow-[0_0_8px_rgba(244,63,94,0.7)]">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-rose-500 rotate-45 rounded-[1px] shadow-sm" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-rose-500 rotate-45 rounded-[1px] shadow-sm" />
            </div>

            <style>{`
              ::part(scroll),
              .scroll {
                padding-left: 50% !important;
                padding-right: 50% !important;
                box-sizing: content-box !important;
                scrollbar-width: none !important;
              }
              ::part(scroll)::-webkit-scrollbar,
              .scroll::-webkit-scrollbar {
                display: none !important;
              }
              ::part(cursor),
              .cursor {
                display: none !important;
                width: 0 !important;
                opacity: 0 !important;
              }
              .wavesurfer-handle-start,
              [part~="region-handle-left"],
              ::part(region-handle-left) {
                width: 14px !important;
                left: -7px !important;
                cursor: col-resize !important;
                z-index: 25 !important;
                pointer-events: auto !important;
                background: transparent !important;
              }
              .wavesurfer-handle-start:hover,
              [part~="region-handle-left"]:hover,
              ::part(region-handle-left):hover {
                background: rgba(245, 158, 11, 0.4) !important;
              }
              [part~="region-handle-right"],
              ::part(region-handle-right) {
                display: none !important;
              }
            `}</style>
            <div ref={containerRef} className="w-full" />
            <div
              ref={timelineRef}
              className="w-full mt-1 border-t border-slate-800 text-[10px] text-slate-400 overflow-x-hidden"
              style={{
                paddingLeft: '50%',
                paddingRight: '50%',
                boxSizing: 'content-box',
              }}
            />
          </div>

          {/* Playback & Marker Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {/* Play/Pause & Transport (matching mobile) */}
            <div className="flex items-center gap-2">
              {markers.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={jumpToPrevMarker}
                  title="Previous Marker (← Left Arrow)"
                  className="h-9 w-9 p-0"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => seekRelative(-10)}
                  title="Rewind 10s (← Left Arrow)"
                  className="h-9 w-9 p-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}

              <Button
                size="sm"
                onClick={togglePlay}
                className="h-9 w-12 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                title="Play / Pause (Space)"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </Button>

              {markers.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={jumpToNextMarker}
                  title="Next Marker (→ Right Arrow)"
                  className="h-9 w-9 p-0"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => seekRelative(10)}
                  title="Forward 10s (→ Right Arrow)"
                  className="h-9 w-9 p-0"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant={isLooping ? 'default' : 'outline'}
                onClick={() => setIsLooping(prev => !prev)}
                title="Loop Section (L)"
                className="h-9 text-xs gap-1 px-2.5"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Loop</span>
              </Button>

              {/* Time Display */}
              <div className="font-mono text-sm font-semibold tracking-wider px-3 py-1 rounded bg-muted/60 border">
                <span>{formatTime(currentTime)}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Drop Marker Button & Selected Marker Info */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={dropMarkerAtCurrentTime}
                className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                title="Drop Marker at Current Time (M)"
              >
                <MapPin className="w-4 h-4" />
                <span>Drop Marker (M)</span>
              </Button>

              {selectedMarkerIdx !== null && (
                <div className="flex items-center gap-1.5 border-l pl-2">
                  <span className="text-xs text-muted-foreground font-mono mr-1">
                    Marker #{selectedMarkerIdx + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMarker(selectedMarkerIdx)}
                    title="Delete Marker (Del)"
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Zoom & Speed */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
                <Slider
                  value={[zoomLevel]}
                  min={0}
                  max={120}
                  step={5}
                  onValueChange={([val]) => setZoomLevel(val)}
                  className="w-24"
                />
                <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              {/* Playback speed */}
              <div className="flex items-center gap-1">
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <Button
                    key={rate}
                    size="sm"
                    variant={playbackRate === rate ? 'secondary' : 'ghost'}
                    onClick={() => setPlaybackRate(rate)}
                    className="h-7 px-1.5 text-[10px] font-mono"
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Grid: Marker Timeline Table & Verse Alignment Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Marker List & Timestamps */}
        <Card className="flex flex-col h-[520px]">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Waveform Markers ({markers.length})</span>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Drag marker to lyric, or drop lyric here &bull; Reflects comment on marker
              </CardDescription>
            </div>
            {markers.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={autoMapSequentially}
                className="text-xs h-7 gap-1 text-primary hover:text-primary"
                title="Map markers to verses 1, 2, 3..."
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Map Verses</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {/* Track Start (00:00.00) Pin & Drop Target */}
            <div
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'marker', markerNum: 0, markerIdx: -1 }));
                e.dataTransfer.effectAllowed = 'link';
                setDraggedItem({ type: 'marker', markerNum: 0, markerIdx: -1 });
              }}
              onDragEnd={() => {
                setDraggedItem(null);
                setDropTargetId(null);
              }}
              onDragOver={(e) => {
                if (draggedItem?.type === 'verse') {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'link';
                  setDropTargetId('track-start');
                }
              }}
              onDragLeave={() => {
                if (dropTargetId === 'track-start') setDropTargetId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDropTargetId(null);
                setDraggedItem(null);
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (data.type === 'verse') {
                    bindVerseToMarker(data.verseIdx, 0);
                  }
                } catch (_) {}
              }}
              onClick={() => {
                if (wavesurferRef.current) wavesurferRef.current.setTime(0);
                setCurrentTime(0);
                setSelectedMarkerIdx(null);
              }}
              className={`p-2.5 border-b flex items-center justify-between cursor-pointer transition-colors ${
                dropTargetId === 'track-start'
                  ? 'bg-emerald-500/20 border-l-4 border-emerald-500 ring-2 ring-emerald-500'
                  : 'bg-muted/15 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span title="Drag to a lyric to bind Track Start">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0" />
                </span>
                <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                  00:00.00
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <span>Track Start</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(Beginning)</span>
                  </div>
                  {/* Reflected Comment for Track Start */}
                  {(() => {
                    const startVerses = verses.filter(v => lyricsMapping[v.index] === 0);
                    if (startVerses.length > 0) {
                      const v = startVerses[0];
                      const preview = v.coptic || v.english || v.arabic || '';
                      return (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 max-w-full">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="font-semibold shrink-0">Comment: Verse #{v.index + 1}</span>
                          {preview && (
                            <span className="text-muted-foreground truncate max-w-[170px] italic">
                              &ldquo;{preview}&rdquo;
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              unbindMarker(0);
                            }}
                            className="h-4 w-4 p-0 ml-auto text-muted-foreground hover:text-destructive shrink-0"
                            title="Unbind verse comment from Track Start"
                          >
                            <Unlink className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 mt-0.5 italic">
                        <MessageSquare className="w-3 h-3 opacity-40 shrink-0" />
                        <span>No comment &bull; Drag verse here or drag to a lyric</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (wavesurferRef.current) {
                    wavesurferRef.current.setTime(0);
                    wavesurferRef.current.play();
                  }
                }}
                className="h-7 w-7 p-0 shrink-0"
                title="Play from track beginning"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>

            {markers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No markers placed yet.</p>
                <p className="text-[11px] mt-1 max-w-xs">
                  Press <kbd className="px-1 py-0.5 rounded bg-muted">Space</kbd> to listen and <kbd className="px-1 py-0.5 rounded bg-muted">M</kbd> to drop markers at verse transitions.
                </p>
              </div>
            ) : (
              <div className="divide-y text-xs">
                {markers.map((time, idx) => {
                  const isSelected = selectedMarkerIdx === idx;
                  const isActive = activeMarkerIdx === idx;
                  const nextTime = idx + 1 < markers.length ? markers[idx + 1] : duration;
                  const segDuration = Math.round((nextTime - time) * 10) / 10;
                  const mappedVerse = getMappedVerseForMarker(idx);
                  const verseObj = mappedVerse ? verses[mappedVerse.verseIdx] : null;
                  const versePreview = verseObj ? (verseObj.coptic || verseObj.english || verseObj.arabic || '') : '';
                  const isDropTarget = dropTargetId === `marker-${idx}`;

                  return (
                    <div
                      key={idx}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'marker', markerNum: idx + 1, markerIdx: idx }));
                        e.dataTransfer.effectAllowed = 'link';
                        setDraggedItem({ type: 'marker', markerNum: idx + 1, markerIdx: idx });
                      }}
                      onDragEnd={() => {
                        setDraggedItem(null);
                        setDropTargetId(null);
                      }}
                      onDragOver={(e) => {
                        if (draggedItem?.type === 'verse') {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'link';
                          setDropTargetId(`marker-${idx}`);
                        }
                      }}
                      onDragLeave={() => {
                        if (dropTargetId === `marker-${idx}`) setDropTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTargetId(null);
                        setDraggedItem(null);
                        try {
                          const data = JSON.parse(e.dataTransfer.getData('application/json'));
                          if (data.type === 'verse') {
                            bindVerseToMarker(data.verseIdx, idx + 1);
                          }
                        } catch (_) {}
                      }}
                      onClick={() => jumpToMarker(idx)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isDropTarget
                          ? 'ring-2 ring-primary bg-primary/20 border-l-4 border-primary'
                          : isSelected
                          ? 'bg-primary/15 border-l-4 border-primary font-medium'
                          : isActive
                          ? 'bg-amber-500/10'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span title="Drag to a lyric to bind this marker">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0" />
                        </span>
                        <span className="font-mono text-muted-foreground w-6 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="font-mono font-semibold text-foreground">
                            {formatTime(time)}
                            <span className="text-[10px] text-muted-foreground ml-2 font-normal">
                              ({time.toFixed(3)}s) &bull; Span: {segDuration}s
                            </span>
                          </div>

                          {/* Reflected Comment on the Marker */}
                          {mappedVerse ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-primary mt-0.5 max-w-full">
                              <MessageSquare className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-semibold text-primary shrink-0">
                                Comment: {mappedVerse.label}
                              </span>
                              {versePreview && (
                                <span className="text-muted-foreground truncate max-w-[170px] italic">
                                  &ldquo;{versePreview}&rdquo;
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unbindMarker(idx + 1);
                                }}
                                className="h-4 w-4 p-0 ml-auto text-muted-foreground hover:text-destructive shrink-0"
                                title="Unbind verse comment from this marker"
                              >
                                <Unlink className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 mt-0.5 italic">
                              <MessageSquare className="w-3 h-3 opacity-40 shrink-0" />
                              <span>No comment &bull; Drag verse here or drag marker to lyric</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => jumpToMarker(idx, true)}
                          className="h-7 w-7 p-0"
                          title="Audition section"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMarker(idx)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete marker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Verse Lyrics Synchronization Panel */}
        <Card className="flex flex-col h-[520px]">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Hymn Lyrics & Verse Binding</span>
                {mappedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-normal ml-1 bg-primary/10 border-primary/30 text-primary">
                    {mappedCount} of {verses.length} Bound
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-[11px]">
                Drag verse onto a marker (or drop marker here) to bind &bull; Click verse to jump track
              </CardDescription>
            </div>
            {onSaveLyrics && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsLyricsModalOpen(true)}
                className="h-7 text-xs gap-1.5 hover:text-primary hover:border-primary/50"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Edit Lyrics</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {verses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground space-y-2">
                <BookOpen className="w-8 h-8 opacity-40 mb-1" />
                <p className="font-medium text-foreground">No lyrics found for this hymn.</p>
                <p className="max-w-xs text-[11px]">
                  Add synchronized Coptic, English, and Arabic verses to align with your audio markers.
                </p>
                {onSaveLyrics && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLyricsModalOpen(true)}
                    className="gap-1.5 text-xs text-primary mt-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Add Lyrics Now</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y text-xs">
                {verses.map(v => {
                  const mappedMarker = getMappedMarkerForVerse(v.index);
                  const isDropTarget = dropTargetId === `verse-${v.index}`;
                  const isActiveNow = activeVerseIdx === v.index;
                  const isMapped = mappedMarker !== null;

                  return (
                    <div
                      key={v.index}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'verse', verseIdx: v.index }));
                        e.dataTransfer.effectAllowed = 'link';
                        setDraggedItem({ type: 'verse', verseIdx: v.index });
                      }}
                      onDragEnd={() => {
                        setDraggedItem(null);
                        setDropTargetId(null);
                      }}
                      onDragOver={(e) => {
                        if (draggedItem?.type === 'marker') {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'link';
                          setDropTargetId(`verse-${v.index}`);
                        }
                      }}
                      onDragLeave={() => {
                        if (dropTargetId === `verse-${v.index}`) setDropTargetId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTargetId(null);
                        setDraggedItem(null);
                        try {
                          const data = JSON.parse(e.dataTransfer.getData('application/json'));
                          if (data.type === 'marker') {
                            bindVerseToMarker(v.index, data.markerNum);
                          }
                        } catch (_) {}
                      }}
                      onClick={() => handleVerseClick(v.index)}
                      title={
                        isMapped
                          ? `Click to move track to ${mappedMarker.label} | Drag onto a marker to rebind`
                          : 'Drag onto a marker on the left to bind'
                      }
                      className={`p-3 space-y-1.5 transition-colors select-none ${
                        isDropTarget
                          ? 'ring-2 ring-primary bg-primary/20 border-l-4 border-primary'
                          : isActiveNow
                          ? 'bg-amber-500/15 border-l-4 border-amber-500'
                          : isMapped
                          ? 'cursor-pointer hover:bg-muted/40'
                          : 'cursor-grab hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span title="Drag this verse onto a marker on the left">
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab active:cursor-grabbing shrink-0" />
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                            Verse #{v.index + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {mappedMarker ? (
                            mappedMarker.markerNum === 0 ? (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-5 px-1.5 gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                                >
                                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                                  <span>Track Start (00:00.00)</span>
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => unbindVerse(v.index)}
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                  title="Unbind verse"
                                >
                                  <Unlink className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-5 px-1.5 gap-1 bg-primary/10 text-primary border-primary/30 font-medium"
                                >
                                  <Check className="w-2.5 h-2.5 text-primary" />
                                  <span>
                                    Marker #{mappedMarker.markerNum} ({formatTime(mappedMarker.time)})
                                  </span>
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => unbindVerse(v.index)}
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                  title="Unbind verse"
                                >
                                  <Unlink className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50 font-mono italic">
                              Unmapped &bull; Drag to marker
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Coptic Line */}
                      {v.coptic && (
                        <p className="font-coptic text-sm text-foreground leading-relaxed pl-5">
                          {v.coptic}
                        </p>
                      )}

                      {/* English Line */}
                      {v.english && (
                        <p className="text-xs text-foreground/80 leading-normal pl-5">
                          {v.english}
                        </p>
                      )}

                      {/* Arabic Line */}
                      {v.arabic && (
                        <p className="text-xs text-muted-foreground text-right font-arabic">
                          {v.arabic}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Modal for In-Studio Lyrics Editing */}
      <Dialog open={isLyricsModalOpen} onOpenChange={setIsLyricsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span>Edit Hymn Lyrics &mdash; {hymn?.name || recording.hymnId}</span>
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Synchronized 3-column verses. Each line corresponds to 1 verse section in the player and marker binding.
                </DialogDescription>
              </div>

              {/* Line alignment indicator badge */}
              <div>
                {areLinesAligned ? (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 bg-emerald-500/10 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All {copticLineCount} verses aligned
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1 bg-amber-500/10 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" /> Lines differ: Cop({copticLineCount}), Eng({englishLineCount}), Ara({arabicLineCount})
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* 3-Column Synchronized Text Editor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 flex-1 overflow-y-auto">
            {/* Coptic Column */}
            <div className="space-y-1.5 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Coptic Lyrics</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {copticLineCount} lines
                </span>
              </div>
              <Textarea
                value={editCoptic}
                onChange={e => setEditCoptic(e.target.value)}
                placeholder="Ⲡⲓⲡⲛⲉⲩⲙⲁ..."
                className="font-coptic text-sm flex-1 min-h-[300px] leading-relaxed resize-none bg-muted/20"
              />
            </div>

            {/* English Column */}
            <div className="space-y-1.5 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>English Phonics / Translation</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {englishLineCount} lines
                </span>
              </div>
              <Textarea
                value={editEnglish}
                onChange={e => setEditEnglish(e.target.value)}
                placeholder="Pi-pnevma..."
                className="text-xs flex-1 min-h-[300px] leading-relaxed resize-none bg-muted/20"
              />
            </div>

            {/* Arabic Column */}
            <div className="space-y-1.5 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Arabic Phonics / Translation</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {arabicLineCount} lines
                </span>
              </div>
              <Textarea
                value={editArabic}
                onChange={e => setEditArabic(e.target.value)}
                placeholder="الروح القدس..."
                dir="rtl"
                className="text-xs flex-1 min-h-[300px] leading-relaxed resize-none bg-muted/20"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Press Enter for each verse. Blank lines are ignored.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLyricsModalOpen(false)}
                disabled={isSavingLyrics}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLyricsModal}
                disabled={isSavingLyrics}
                className="gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                {isSavingLyrics ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Lyrics to Cloud</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
