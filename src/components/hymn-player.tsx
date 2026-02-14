
"use client";

import type { Hymn, Recording } from "@/lib/types";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  Repeat,
  SkipBack,
  SkipForward,
  FastForward,
  XCircle,
  Maximize2,
  Minimize2,
  Type,
  Rewind,
  ChevronLeft,
  ChevronRight,
  BookText,
  Share2,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { getDownloadURL, ref, getStorage } from "firebase/storage";
import { useFirebase } from "@/firebase";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { HymnPlayerTutorial } from "./hymn-player-tutorial";


function formatTime(seconds: number) {
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

const VISIBLE_DURATION_S = 60; // 1 minute window

function useLyricContent(path?: string) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { firebaseApp } = useFirebase();
  const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [firebaseApp]);

  useEffect(() => {
    if (!path || !storage) {
      setContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const textContent = await response.text();
        const trimmedContent = textContent.trim();

        if (!isCancelled) {
          setContent(trimmedContent);
        }
      } catch (e: any) {
        if (!isCancelled) {
          let detailedError = `Failed to fetch from ${path}. Error: ${e.message}`;
          // Check for the classic CORS error signature
          if (e.message.toLowerCase().includes('failed to fetch')) {
            detailedError += `\n\nThis is often a Cross-Origin (CORS) issue. Your web app domain may not be authorized to fetch from Firebase Storage. Please check your bucket's CORS configuration in the Google Cloud Console.`;
          }
          setError(detailedError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchContent();

    return () => {
      isCancelled = true;
    };
  }, [path, storage]);

  return { content, isLoading, error };
}

function useMarkersFile(path?: string) {
    const [marks, setMarks] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    const { firebaseApp } = useFirebase();
    const storage = useMemo(() => (firebaseApp ? getStorage(firebaseApp) : null), [firebaseApp]);
  
    useEffect(() => {
      if (!path || !storage) {
        setMarks([]);
        setIsLoading(false);
        setError(null);
        return;
      }
  
      let isCancelled = false;
      const fetchContent = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const storageRef = ref(storage, path);
          const url = await getDownloadURL(storageRef);
          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`Markers file request failed with status ${response.status}`);
          }
          const textContent = (await response.text()).trim();
          if (!isCancelled) {
            if (textContent) {
              const parsedMarks = textContent.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
              setMarks(parsedMarks);
            } else {
              setMarks([]);
            }
          }
        } catch (e: any) {
          if (!isCancelled) {
            setError(e.message || 'Failed to fetch markers');
            setMarks([]);
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
      };
  
      fetchContent();
  
      return () => {
        isCancelled = true;
      };
    }, [path, storage]);
  
    return { marks, isLoading, error };
  }


const LyricsDisplay = ({ hymn }: { hymn: Hymn }) => {
  const [visible, setVisible] = useState({
    english: true,
    coptic: true,
    arabic: false,
  });
  const [isContained, setIsContained] = useState(true);
  const [fontSize, setFontSize] = useState('sm');
  const fontSizes = ['sm', 'base', 'lg', 'xl'];

  const cycleFontSize = () => {
    const currentIndex = fontSizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    setFontSize(fontSizes[nextIndex]);
  };

  const { content: englishContent, isLoading: isLoadingEnglish, error: errorEnglish } = useLyricContent(hymn.lyricsEnglish);
  const { content: copticContent, isLoading: isLoadingCoptic, error: errorCoptic } = useLyricContent(hymn.lyricsCoptic);
  const { content: arabicContent, isLoading: isLoadingArabic, error: errorArabic } = useLyricContent(hymn.lyricsArabic);

  const available = useMemo(() => ({
    english: hymn.lyricsEnglish,
    coptic: hymn.lyricsCoptic,
    arabic: hymn.lyricsArabic,
  }), [hymn.lyricsEnglish, hymn.lyricsCoptic, hymn.lyricsArabic]);

  const allAvailableLangs = useMemo(() => (Object.keys(available) as Array<keyof typeof available>)
    .filter(lang => available[lang]), [available]);

  const visibleLangs = useMemo(() => (Object.keys(available) as Array<keyof typeof available>)
    .filter(lang => available[lang] && visible[lang]), [available, visible]);
    
  const hasAnyLyrics = useMemo(() => Object.values(available).some(Boolean), [available]);

  const langConfigs = useMemo(() => ({
    english: { dir: 'ltr', lang: 'en', isLoading: isLoadingEnglish, error: errorEnglish, content: englishContent, label: "English" },
    coptic:  { dir: 'ltr', lang: 'cop', isLoading: isLoadingCoptic, error: errorCoptic, content: copticContent, label: "Coptic" },
    arabic:  { dir: 'rtl', lang: 'ar', isLoading: isLoadingArabic, error: errorArabic, content: arabicContent, label: "Arabic" },
  } as const), [isLoadingEnglish, errorEnglish, englishContent, isLoadingCoptic, errorCoptic, copticContent, isLoadingArabic, errorArabic, arabicContent]);

  const versesByLang = useMemo(() => {
    const result: Record<string, string[]> = {};
    visibleLangs.forEach(lang => {
      const config = langConfigs[lang];
      if (config.content) {
        const trimmedContent = config.content.trim();
        if (trimmedContent) {
          result[lang] = trimmedContent.split(/\n\s*\n/).map(v => v.trim());
        } else {
           result[lang] = [];
        }
      } else {
        result[lang] = [];
      }
    });
    return result;
  }, [visibleLangs, langConfigs]);

  const maxVerses = useMemo(() => {
    if (Object.keys(versesByLang).length === 0) return 0;
    return Math.max(0, ...Object.values(versesByLang).map(verses => verses.length));
  }, [versesByLang]);

  const LYRIC_SCROLL_THRESHOLD = 4;
  const canBeContained = maxVerses > LYRIC_SCROLL_THRESHOLD;

  const isLoading = visibleLangs.some(lang => langConfigs[lang].isLoading);

  const renderVerseContent = (content: string | undefined) => {
    if (!content || content.trim() === '') {
        return <p>&nbsp;</p>;
    }
    return <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} className="prose dark:prose-invert max-w-none">{content}</ReactMarkdown>;
  };
  
  const anyError = visibleLangs.map(lang => langConfigs[lang].error).find(Boolean);

  if (!hasAnyLyrics) {
    return null;
  }

  return (
    <div className="w-full pt-4">
      {allAvailableLangs.length > 0 && (
          <div className="mb-2 flex gap-2 items-center">
              {allAvailableLangs.map(lang => (
                  <Button
                      key={lang}
                      variant="outline"
                      size="sm"
                      onClick={() => setVisible(v => ({ ...v, [lang]: !v[lang] }))}
                      className={cn(
                          'transition-colors',
                          visible[lang] && 'bg-green-600 text-white hover:bg-green-700 hover:text-white border-green-700'
                      )}
                  >
                      {langConfigs[lang].label}
                  </Button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={cycleFontSize}
                    title="Change text size"
                >
                    <Type className="h-4 w-4" />
                    <span className="sr-only">Change text size</span>
                </Button>
                {canBeContained && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsContained(v => !v)}
                        title={isContained ? 'Expand lyrics' : 'Collapse lyrics'}
                    >
                        {isContained ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                        <span className="sr-only">{isContained ? 'Expand lyrics' : 'Collapse lyrics'}</span>
                    </Button>
                )}
              </div>
          </div>
      )}
      
      <ScrollArea className={cn("w-full rounded-md border bg-secondary/20", isContained && canBeContained && "h-[40vh]")}>
        <div className="min-w-0">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : anyError ? (
             <div className="p-4">
                <p className="text-sm text-destructive whitespace-pre-wrap">{anyError}</p>
             </div>
          ) : (
            <>
              {Array.from({ length: maxVerses }).map((_, verseIndex) => (
                <div key={verseIndex} className={cn(
                  "flex flex-row",
                  verseIndex > 0 && "border-t"
                )}>
                  {visibleLangs.map((lang, langIndex) => {
                    const config = langConfigs[lang];
                    const verse = versesByLang[lang]?.[verseIndex];
                    return (
                      <div
                        key={lang}
                        className={cn(
                          "flex-1 p-4 min-w-0",
                          langIndex > 0 && "border-l"
                        )}
                        dir={config.dir}
                      >
                        <div
                          lang={config.lang}
                          className={cn("text-muted-foreground", {
                            'text-sm': fontSize === 'sm',
                            'text-base': fontSize === 'base',
                            'text-lg': fontSize === 'lg',
                            'text-xl': fontSize === 'xl',
                          })}
                        >
                          {renderVerseContent(verse)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};


export function HymnPlayer({
  hymn,
  onEnded,
  autoplay = false,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  lyricsVisibleByDefault = true,
  showLyricsToggleButton = false,
  initialRecordingId,
  onRecordingChange,
  playbackRate,
  onPlaybackRateChange,
  genreId,
}: {
  hymn: Hymn;
  onEnded?: () => void;
  autoplay?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  lyricsVisibleByDefault?: boolean;
  showLyricsToggleButton?: boolean;
  initialRecordingId?: string;
  onRecordingChange?: (recording: Recording) => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  genreId?: string;
}) {
  const { firebaseApp } = useFirebase();
  const storage = useMemo(() => firebaseApp ? getStorage(firebaseApp) : null, [firebaseApp]);
  const { toast } = useToast();

  const [currentRecording, setCurrentRecording] = useState<Recording | undefined>(() => {
    if (initialRecordingId) {
      const initialRec = hymn.recordings?.find(r => r.id === initialRecordingId);
      if (initialRec) return initialRec;
    }
    return hymn.recordings?.[0];
  });
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const { marks: loadedMarks, isLoading: isLoadingMarks, error: marksError } = useMarkersFile(
    currentRecording?.mode === 'learn' ? currentRecording.markersUrl : undefined
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const currentPlaybackRate = playbackRate ?? 1;
  const [autoplayOnSwitch, setAutoplayOnSwitch] = useState(autoplay);
  
  const [activeMarks, setActiveMarks] = useState<number[]>([]);
  const [lyricsVisible, setLyricsVisible] = useState(lyricsVisibleByDefault);
  
  const [isSeeking, setIsSeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const waveformInnerRef = useRef<HTMLDivElement>(null);
  const loopSectionRef = useRef<{ start: number, end: number } | null>(null);
  const dragStartRef = useRef<{ x: number; time: number } | null>(null);
  
  const sortedMarks = useMemo(() => [...(loadedMarks || [])].sort((a, b) => a - b), [loadedMarks]);
  
  useEffect(() => {
    if (currentRecording?.mode === 'learn') {
        setActiveMarks(sortedMarks);
    } else {
        setActiveMarks([]);
    }
  }, [sortedMarks, currentRecording?.mode]);
  
  const sortedActiveMarks = useMemo(() => [...activeMarks].sort((a, b) => a - b), [activeMarks]);
  const displayedMarks = useMemo(() => currentRecording?.mode === 'learn' ? sortedMarks : [], [currentRecording, sortedMarks]);

  const playbackSpeeds = [1.0, 1.25, 1.5, 1.75, 2.0];
  const handleSpeedChange = () => {
      const currentIndex = playbackSpeeds.indexOf(currentPlaybackRate);
      const nextIndex = (currentIndex + 1) % playbackSpeeds.length;
      onPlaybackRateChange?.(playbackSpeeds[nextIndex]);
  };

  const hasAnyLyrics = useMemo(() => 
    !!(hymn.lyricsEnglish || hymn.lyricsCoptic || hymn.lyricsArabic)
  , [hymn]);

  const handleNextHymn = useCallback(() => {
    onNext?.();
  }, [onNext]);

  const handlePreviousHymn = useCallback(() => {
    onPrevious?.();
  }, [onPrevious]);

  useEffect(() => {
    // This effect ensures that whenever the hymn prop changes,
    // we reset the state and select the correct initial recording.
    setAutoplayOnSwitch(autoplay); // Respect the autoplay prop for incoming hymns.
    if (hymn && hymn.recordings && hymn.recordings.length > 0) {
      if (initialRecordingId) {
        const initialRec = hymn.recordings.find(r => r.id === initialRecordingId);
        setCurrentRecording(initialRec || hymn.recordings[0]);
      } else {
        setCurrentRecording(hymn.recordings[0]);
      }
    } else {
      setCurrentRecording(undefined);
    }
  }, [hymn, initialRecordingId, autoplay]);
  
  useEffect(() => {
    // When the recording changes, reset the player state.
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioSrc(null);
    setAudioError(null);
    setDuration(0);

    if (currentRecording && storage) {
      setIsLoadingAudio(true);
      setAudioError(null);
      const audioFileRef = ref(storage, currentRecording.audioUrl);
      getDownloadURL(audioFileRef)
        .then(url => {
          setAudioSrc(url);
        })
        .catch(error => {
          setAudioError(error.code || error.message || 'Failed to fetch audio.');
        })
        .finally(() => {
            setIsLoadingAudio(false);
        });
    } else if (currentRecording && !storage) {
        setAudioError('Storage service is not available.');
    }
  }, [currentRecording, storage]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = currentPlaybackRate;
    }
  }, [currentPlaybackRate, audioSrc]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current || !isFinite(duration) || duration <= 0) return;
    const newTime = Math.max(0, Math.min(time, duration));
    if (audioRef.current && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [duration]);

  useEffect(() => {
    if (isRepeat && sortedActiveMarks.length > 0) {
      const marksForLooping = [0, ...sortedActiveMarks];
      const currentSectionStart = [...marksForLooping].reverse().find(mark => mark <= currentTime);
      const currentSectionEnd = marksForLooping.find(mark => mark > (currentSectionStart ?? -1));

      if (currentSectionStart !== undefined && currentSectionEnd !== undefined) {
        loopSectionRef.current = { start: currentSectionStart, end: currentSectionEnd };
      } else {
        loopSectionRef.current = null;
      }
    } else {
      loopSectionRef.current = null;
    }
  }, [isRepeat, sortedActiveMarks, currentTime]);

  useEffect(() => {
    if (waveformContainerRef.current && waveformInnerRef.current && duration > VISIBLE_DURATION_S) {
        const fullWidth = waveformInnerRef.current.scrollWidth;
        const containerWidth = waveformContainerRef.current.offsetWidth;
        
        const scrollStartTime = VISIBLE_DURATION_S / 2;
        const scrollEndTime = duration - VISIBLE_DURATION_S / 2;

        let scrollTarget;
        if (currentTime < scrollStartTime) {
            scrollTarget = 0;
        } else if (currentTime > scrollEndTime) {
            scrollTarget = fullWidth - containerWidth;
        } else {
            const scrollProgress = (currentTime - scrollStartTime) / (scrollEndTime - scrollStartTime);
            scrollTarget = scrollProgress * (fullWidth - containerWidth);
        }
        
        waveformInnerRef.current.style.transform = `translateX(-${scrollTarget}px)`;
    } else if (waveformInnerRef.current) {
        waveformInnerRef.current.style.transform = `translateX(0px)`;
    }
  }, [currentTime, duration]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(error => {
        console.error("Playback failed. This can happen if the user hasn't interacted with the page yet.", error);
      });
    } else {
      audio.pause();
    }
  }, []);

  const handleNextSection = useCallback(() => {
    if (!audioRef.current) return;
    const nextMark = sortedActiveMarks.find(mark => mark > currentTime + 0.5); 
    if (nextMark !== undefined) {
      seek(nextMark);
    } else {
      seek(duration);
    }
  }, [sortedActiveMarks, currentTime, seek, duration]);

  const handlePrevSection = useCallback(() => {
    const REWIND_THRESHOLD = 2; // in seconds
    if (!audioRef.current) return;
  
    const reversedMarks = [...sortedActiveMarks].reverse();
    
    const currentSectionStartMarker = reversedMarks.find(mark => mark < currentTime);
  
    if (currentSectionStartMarker === undefined) {
      seek(0);
      return;
    }
  
    if (currentTime > currentSectionStartMarker + REWIND_THRESHOLD) {
      seek(currentSectionStartMarker);
    } else {
      const currentMarkerIndex = reversedMarks.indexOf(currentSectionStartMarker);
      const previousSectionStartMarker = reversedMarks[currentMarkerIndex + 1];
  
      seek(previousSectionStartMarker !== undefined ? previousSectionStartMarker : 0);
    }
  }, [sortedActiveMarks, currentTime, seek]);
  
  const handleSkip = useCallback((amount: number) => {
    if (!audioRef.current) return;
    seek(currentTime + amount);
  }, [currentTime, seek]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentRecording && hymn) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: hymn.name,
        artist: currentRecording.cantor?.name || 'Unknown Cantor',
        album: 'Cantor',
        artwork: [
          { src: '/icon', type: 'image/png', sizes: '32x32' },
          { src: '/apple-icon', type: 'image/png', sizes: '180x180' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', handlePlayPause);
      navigator.mediaSession.setActionHandler('pause', handlePlayPause);

      if (onPrevious && hasPrevious) {
        navigator.mediaSession.setActionHandler('previoustrack', handlePreviousHymn);
      } else {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }

      if (onNext && hasNext) {
        navigator.mediaSession.setActionHandler('nexttrack', handleNextHymn);
      } else {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }

      const isLearnMode = currentRecording?.mode === 'learn';
      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (isLearnMode) {
          handleNextSection();
        } else {
          handleSkip(10);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (isLearnMode) {
          handlePrevSection();
        } else {
          handleSkip(-10);
        }
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      
      const isLearnMode = currentRecording?.mode === 'learn';

      switch (event.code) {
        case 'Space':
            if (!event.repeat) {
                event.preventDefault();
                handlePlayPause();
            }
            break;
        case 'ArrowRight':
            if (!event.repeat) {
                event.preventDefault();
                if (isLearnMode) {
                    handleNextSection();
                } else {
                    handleSkip(10);
                }
            }
            break;
        case 'ArrowLeft':
            if (!event.repeat) {
                event.preventDefault();
                if (isLearnMode) {
                    handlePrevSection();
                } else {
                    handleSkip(-10);
                }
            }
            break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
      }
    };
  }, [currentRecording, hymn, hasNext, hasPrevious, onNext, onPrevious, handlePlayPause, handleNextHymn, handlePreviousHymn, handleNextSection, handlePrevSection, handleSkip]);


  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-marker-toggle]') || !isFinite(duration) || duration <= 0) {
      return;
    }
    e.preventDefault();
    
    setIsSeeking(true);
    setIsDragging(false);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartRef.current = { x: clientX, time: currentTime };
  };
  
  const handleSeekMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isSeeking || !dragStartRef.current) return;
    e.preventDefault();
    
    if (!isDragging) {
      setIsDragging(true);
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartRef.current.x;

    const SENSITIVITY = 0.15; // seconds per pixel
    const timeChange = -deltaX * SENSITIVITY;

    const newTime = dragStartRef.current.time + timeChange;
    seek(newTime);

  }, [isSeeking, seek]);

  const handleSeekEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isSeeking) return;
    e.preventDefault();
    
    if (!isDragging) {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const containerRect = waveformContainerRef.current!.getBoundingClientRect();
      const clickXInContainer = clientX - containerRect.left;

      const transform = window.getComputedStyle(waveformInnerRef.current!).transform;
      let scrollLeft = 0;
      if (transform !== 'none') {
          const matrix = new DOMMatrix(transform);
          scrollLeft = -matrix.e;
      }

      const clickXInScroller = clickXInContainer + scrollLeft;
      const scrollerWidth = waveformInnerRef.current!.scrollWidth;
      
      const time = (clickXInScroller / scrollerWidth) * duration;
      seek(time);
    }
    
    setIsSeeking(false);
    setIsDragging(false);
    dragStartRef.current = null;
  }, [isSeeking, isDragging, duration, seek]);
  
  useEffect(() => {
    if (isSeeking) {
      window.addEventListener('mousemove', handleSeekMove);
      window.addEventListener('touchmove', handleSeekMove);
      window.addEventListener('mouseup', handleSeekEnd);
      window.addEventListener('touchend', handleSeekEnd);
    } else {
      window.removeEventListener('mousemove', handleSeekMove);
      window.removeEventListener('touchmove', handleSeekMove);
      window.removeEventListener('mouseup', handleSeekEnd);
      window.removeEventListener('touchend', handleSeekEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleSeekMove);
      window.removeEventListener('touchmove', handleSeekMove);
      window.removeEventListener('mouseup', handleSeekEnd);
      window.removeEventListener('touchend', handleSeekEnd);
    }
  }, [isSeeking, handleSeekMove, handleSeekEnd]);

  
  const toggleMark = (mark: number) => {
    setActiveMarks(prev => 
        prev.includes(mark) ? prev.filter(m => m !== mark) : [...prev, mark]
    );
  };

  const waveformWidthStyle = useMemo(() => {
    if (duration <= 0) return { width: '100%' };
    const multiplier = Math.max(1, duration / VISIBLE_DURATION_S);
    return { width: `${multiplier * 100}%` };
  }, [duration]);

  const playheadPositionStyle = useMemo(() => {
    if (duration <= 0) return { left: '0%' };
    
    if (duration <= VISIBLE_DURATION_S) {
      return { left: `${(currentTime / duration) * 100}%` };
    }

    const scrollStartTime = VISIBLE_DURATION_S / 2;
    const scrollEndTime = duration - VISIBLE_DURATION_S / 2;
    
    if (currentTime < scrollStartTime) {
      const progress = currentTime / VISIBLE_DURATION_S;
      return { left: `${progress * 100}%` };
    }
    
    if (currentTime > scrollEndTime) {
       const progress = (currentTime - (duration - VISIBLE_DURATION_S)) / VISIBLE_DURATION_S;
       return { left: `${progress * 100}%` };
    }

    return { left: '50%' };

  }, [currentTime, duration]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isSeeking) return;

    const newTime = audio.currentTime;
    setCurrentTime(newTime);
    
    if (isRepeat && isPlaying && loopSectionRef.current) {
        const { start, end } = loopSectionRef.current;
        if (newTime >= end) {
            seek(start);
        }
    }
  }, [isRepeat, isPlaying, isSeeking, seek]);

  const handleEnded = useCallback(() => {
    if (onEnded) {
        onEnded();
    }
  }, [onEnded]);

  const handleLoadedData = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
    } else {
        setDuration(0);
    }
    setCurrentTime(audio.currentTime);
  };

  const handleCanPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = currentPlaybackRate;
    if (autoplayOnSwitch) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((e) => {
                // This error is expected in some cases, so we just log it.
                console.log("Autoplay was prevented by the browser.");
            });
        }
        setAutoplayOnSwitch(false);
    }
  }, [autoplayOnSwitch, currentPlaybackRate]);
  
  const handleShare = () => {
    if (!hymn || !currentRecording) return;
    // Construct a URL that points to the individual hymn page with the specific recording selected.
    let url = `${window.location.origin}/hymn/${hymn.id}?recordingId=${currentRecording.id}`;
    if (genreId) {
      url += `&genre=${genreId}`;
    }
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "URL Copied.",
        duration: 2000,
      });
    }).catch(err => {
        console.error("Failed to copy URL: ", err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the URL to your clipboard.",
        });
    });
  };

  if (!hymn.recordings || hymn.recordings.length === 0) {
      return (
        <>
            <Card className="w-full max-w-3xl mx-auto shadow-xl">
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <CardTitle className="font-headline text-3xl text-primary">
                            {hymn.name}
                        </CardTitle>
                    </div>
                    {hymn.description && (
                        <p className="text-muted-foreground mt-2">{hymn.description}</p>
                    )}
                    <p className="text-muted-foreground pt-4">No active recordings available for this hymn yet.</p>
                </CardHeader>
            </Card>
            {lyricsVisible && hasAnyLyrics && (
              <div className="w-full max-w-3xl mx-auto mt-8">
                  <LyricsDisplay hymn={hymn} />
              </div>
            )}
        </>
      )
  }

  if (!currentRecording) {
     return (
        <>
            <Card className="w-full max-w-3xl mx-auto shadow-xl">
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <CardTitle className="font-headline text-3xl text-primary">
                            {hymn.name}
                        </CardTitle>
                    </div>
                    {hymn.description && (
                    <p className="text-muted-foreground mt-2">{hymn.description}</p>
                    )}
                    <p className="text-muted-foreground pt-4">Please select a recording.</p>
                </CardHeader>
            </Card>
            {lyricsVisible && hasAnyLyrics && (
              <div className="w-full max-w-3xl mx-auto mt-8">
                  <LyricsDisplay hymn={hymn} />
              </div>
            )}
        </>
      )
  }
  
  const isPlayerDisabled = !audioSrc || !!audioError;
  const showControls = currentRecording?.mode === 'learn';
  const showLoadingSpinner = isLoadingAudio || (showControls && isLoadingMarks);

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <audio 
            ref={audioRef} 
            src={audioSrc ?? undefined}
            preload="metadata"
            onLoadedData={handleLoadedData}
            onDurationChange={handleLoadedData}
            onCanPlay={handleCanPlay}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
        />
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary">
              {hymn.name}
          </CardTitle>
          {hymn.description && (
              <p className="text-muted-foreground mt-2">{hymn.description}</p>
          )}
          <div className="pt-4 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare} disabled={isPlayerDisabled} title="Share" className="active:bg-accent active:text-accent-foreground">
                      <Share2 className="h-4 w-4" />
                      <span className="sr-only">Share</span>
                  </Button>
                  {showLyricsToggleButton && hasAnyLyrics && (
                      <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setLyricsVisible(v => !v)}
                          className={cn(
                              'transition-colors',
                              lyricsVisible && 'bg-green-600 text-white hover:bg-green-700 hover:text-white border-green-700'
                          )}
                          title="Toggle Lyrics"
                      >
                          <BookText className="h-4 w-4" />
                          <span className="sr-only">Toggle Lyrics</span>
                      </Button>
                  )}
              </div>
              
              <div className="w-full sm:w-auto max-w-[180px]">
                  {hymn.recordings && hymn.recordings.length > 1 ? (
                      <Select
                          value={currentRecording.id}
                          onValueChange={(recId) => {
                              const newRec = hymn.recordings!.find((r) => r.id === recId);
                              if (newRec) {
                                  setAutoplayOnSwitch(true);
                                  setCurrentRecording(newRec);
                                  onRecordingChange?.(newRec);
                              }
                          }}
                      >
                          <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Cantor" />
                          </SelectTrigger>
                          <SelectContent>
                              {hymn.recordings.map((rec) => (
                                  <SelectItem key={rec.id} value={rec.id}>
                                      <div className="flex items-center gap-2">
                                          {rec.mode === 'learn' && <div className="h-2 w-2 rounded-full bg-green-500" />}
                                          <span>{rec.cantor?.name || `Rec: ${rec.id.substring(0,4)}`}</span>
                                      </div>
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  ) : (
                      <div className="flex items-center justify-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground bg-secondary/50 w-full">
                          {currentRecording.mode === 'learn' && <div className="h-2 w-2 rounded-full bg-green-500" />}
                          <span className="truncate">{currentRecording.cantor?.name || '...'}</span>
                      </div>
                  )}
              </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className={`space-y-6 transition-opacity ${isPlayerDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
            <div 
                  ref={waveformContainerRef} 
                  className="relative w-full h-20 bg-secondary/50 rounded-lg group touch-none overflow-hidden"
                  onMouseDown={handleSeekStart}
                  onTouchStart={handleSeekStart}
              >
                  <div 
                      ref={waveformInnerRef}
                      className="absolute top-0 left-0 h-full"
                      style={{
                          ...waveformWidthStyle,
                          willChange: 'transform',
                      }}
                  >
                      {duration > 0 && Array.from({ length: Math.ceil(duration) * 2 }).map((_, i) => {
                        const seed = i + (currentRecording?.audioUrl.length || 0);
                        const barHeight = ((Math.sin(seed) + 1) / 2) * 60 + 20;
                        return (
                            <div
                              key={i}
                              className="absolute bottom-0 w-px bg-muted/50"
                              style={{
                                  left: `${(i / (Math.ceil(duration) * 2)) * 100}%`,
                                  height: `${barHeight}%`,
                              }}
                            />
                        )
                      })}
                      {duration > 0 && displayedMarks.map((mark, index) => {
                          const isActive = activeMarks.includes(mark);
                          return (
                          <div
                              key={index}
                              className="absolute top-0 w-0.5 h-full z-10 pointer-events-none"
                              style={{ 
                                  left: `${(mark / duration) * 100}%`,
                                  backgroundColor: isActive ? 'hsl(var(--primary) / 0.75)' : 'hsl(var(--muted-foreground) / 0.5)',
                              }}
                          >
                              <button
                                  data-marker-toggle
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMark(mark)
                                  }}
                                  className={`absolute top-1/2 -translate-y-[calc(50%+18px)] -left-3 w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center pointer-events-auto cursor-pointer transition-colors ${
                                      isActive ? 'bg-primary/75 text-primary-foreground' : 'bg-muted-foreground/50 text-muted-foreground'
                                  }`}
                              >
                                  {index + 1}
                              </button>
                          </div>
                      )})}
                  </div>

                  <div 
                      className="absolute top-0 h-full w-0.5 bg-red-500 z-30 pointer-events-none -translate-x-1/2"
                      style={playheadPositionStyle}
                  >
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
              </div>

              <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
              </div>

              <div className="flex justify-between items-center">
                  <div className="w-[100px] justify-start" />

                  <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-4">
                            {showControls ? (
                                <Button variant="ghost" size="icon" onClick={handlePrevSection} disabled={sortedActiveMarks.length === 0}>
                                    <SkipBack className="h-6 w-6" />
                                    <span className="sr-only">Previous Section</span>
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => handleSkip(-10)}>
                                    <Rewind className="h-6 w-6" />
                                    <span className="sr-only">Rewind 10 seconds</span>
                                </Button>
                            )}

                            <Button size="icon" className="h-16 w-16 rounded-full" onClick={handlePlayPause}>
                                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                                <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                            </Button>

                            {showControls ? (
                                <Button variant="ghost" size="icon" onClick={handleNextSection} disabled={sortedActiveMarks.length === 0}>
                                    <SkipForward className="h-6 w-6" />
                                    <span className="sr-only">Next Section</span>
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => handleSkip(10)}>
                                     <FastForward className="h-6 w-6" />
                                    <span className="sr-only">Fast Forward 10 seconds</span>
                                </Button>
                            )}
                      </div>
                      {showControls && (
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsRepeat(!isRepeat)}
                              className={cn(
                                "transition-colors px-4",
                                isRepeat
                                  ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                                  : "text-muted-foreground"
                              )}
                          >
                              <Repeat className="h-5 w-5 mr-2" />
                              <span>Repeat Section</span>
                          </Button>
                      )}
                  </div>
                  
                  <div className="flex items-center gap-2 w-[100px] justify-end">
                      <Button variant="outline" onClick={handleSpeedChange} className="w-full">
                        <FastForward className="h-4 w-4 mr-1" />
                        <span>{currentPlaybackRate.toFixed(2)}x</span>
                      </Button>
                  </div>
              </div>
              {(onNext || onPrevious) && (
                <div className="grid grid-cols-3 items-center border-t pt-4 mt-4">
                    <div className="justify-self-start">
                        <Button variant="outline" size="icon" onClick={() => setIsTutorialOpen(true)} title="How to use the player">
                            <HelpCircle className="h-4 w-4" />
                            <span className="sr-only">Help</span>
                        </Button>
                    </div>
                    <div className="flex justify-center items-center gap-4 col-start-2">
                        <Button variant="outline" size="lg" onClick={handlePreviousHymn} disabled={!hasPrevious}>
                            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
                        </Button>
                        <Button variant="outline" size="lg" onClick={handleNextHymn} disabled={!hasNext}>
                            Next <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
              )}
          </div>
          {showLoadingSpinner && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin"/>
                  <p className="text-muted-foreground">Loading resources...</p>
              </div>
          )}
          {audioError && !isLoadingAudio && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <XCircle className="h-10 w-10 text-destructive mb-4" />
                  <p className="text-lg font-semibold text-destructive">Audio Failed to Load</p>
                  <p className="text-sm text-muted-foreground max-w-xs">{audioError}</p>
              </div>
          )}
          {marksError && !isLoadingMarks && (
               <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                    <XCircle className="h-10 w-10 text-destructive mb-4" />
                    <p className="text-lg font-semibold text-destructive">Markers Failed to Load</p>
                    <p className="text-sm text-muted-foreground max-w-xs">{marksError}</p>
                </div>
          )}
        </CardContent>
      </Card>
      {lyricsVisible && hasAnyLyrics && (
        <div className="w-full max-w-3xl mx-auto mt-8">
          <LyricsDisplay hymn={hymn} />
        </div>
      )}
      <HymnPlayerTutorial open={isTutorialOpen} onOpenChange={setIsTutorialOpen} />
    </>
  );
}
