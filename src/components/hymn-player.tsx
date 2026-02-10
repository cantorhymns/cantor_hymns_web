
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
} from "lucide-react";
import { getDownloadURL, ref, getStorage } from "firebase/storage";
import { useFirebase } from "@/firebase";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { ScrollArea } from "./ui/scroll-area";


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
  onAutoplayConsumed,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: {
  hymn: Hymn;
  onEnded?: () => void;
  autoplay?: boolean;
  onAutoplayConsumed?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}) {
  const { firebaseApp } = useFirebase();
  const storage = useMemo(() => firebaseApp ? getStorage(firebaseApp) : null, [firebaseApp]);

  const [currentRecording, setCurrentRecording] = useState<Recording | undefined>(
    hymn.recordings?.[0]
  );
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const [activeMarks, setActiveMarks] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const waveformInnerRef = useRef<HTMLDivElement>(null);
  const loopSectionRef = useRef<{ start: number, end: number } | null>(null);
  const wasPlayingBeforeSeek = useRef(false);
  
  const sortedMarks = useMemo(() => [...(currentRecording?.marks || [])].sort((a, b) => a - b), [currentRecording]);
  const sortedActiveMarks = useMemo(() => [...activeMarks].sort((a, b) => a - b), [activeMarks]);
  
  const displayedMarks = useMemo(() => currentRecording?.mode === 'learn' ? sortedMarks : [], [currentRecording, sortedMarks]);

  const playbackSpeeds = [1.0, 1.25, 1.5, 1.75, 2.0];
  const handleSpeedChange = () => {
      const currentIndex = playbackSpeeds.indexOf(playbackRate);
      const nextIndex = (currentIndex + 1) % playbackSpeeds.length;
      setPlaybackRate(playbackSpeeds[nextIndex]);
  };

  useEffect(() => {
    if (hymn && hymn.recordings && hymn.recordings.length > 0) {
      setCurrentRecording(hymn.recordings[0]);
    } else {
      setCurrentRecording(undefined);
    }
  }, [hymn?.recordings]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    
    setCurrentTime(0);
    setPlaybackRate(1);
    setAudioSrc(null);
    setAudioError(null);
    setDuration(0);
    setActiveMarks(currentRecording?.mode === 'learn' ? (currentRecording.marks || []) : []);

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
    const audio = audioRef.current;
    if (audio && audioSrc && autoplay) {
        audio.play().then(() => {
            setIsPlaying(true);
            onAutoplayConsumed?.();
        }).catch(() => {
            setIsPlaying(false);
            onAutoplayConsumed?.();
        });
    }
  }, [audioSrc, autoplay, onAutoplayConsumed]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current || duration <= 0) return;
    const newTime = Math.max(0, Math.min(time, time, duration));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);
  
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
    setIsPlaying(false);
    if (onEnded) {
        onEnded();
    }
  }, [onEnded]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      } else {
        setDuration(0);
      }
      setCurrentTime(audio.currentTime);
    };
    
    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("durationchange", setAudioData);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("durationchange", setAudioData);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleEnded, handleTimeUpdate, audioSrc]);

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

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        setIsPlaying(false);
      }
    }
  };

  const updateSeekPosition = useCallback((clientX: number) => {
    if (!waveformContainerRef.current || !waveformInnerRef.current || !audioRef.current || duration <= 0) return;

    const containerRect = waveformContainerRef.current.getBoundingClientRect();
    const clickXInContainer = clientX - containerRect.left;

    const transform = window.getComputedStyle(waveformInnerRef.current).transform;
    let scrollLeft = 0;
    if (transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        scrollLeft = -matrix.e;
    }

    const clickXInScroller = clickXInContainer + scrollLeft;
    const scrollerWidth = waveformInnerRef.current.scrollWidth;

    const newTime = (clickXInScroller / scrollerWidth) * duration;
    seek(newTime);
  }, [duration, seek]);

  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.closest('[data-marker-toggle]')) {
      return;
    }
    
    if (!audioRef.current) return;
    
    setIsSeeking(true);
    wasPlayingBeforeSeek.current = isPlaying;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateSeekPosition(clientX);
  };

  const handleSeekMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isSeeking) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updateSeekPosition(clientX);
  }, [isSeeking, updateSeekPosition]);

  const handleSeekEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isSeeking) return;
    e.preventDefault();
    setIsSeeking(false);

    if (wasPlayingBeforeSeek.current && audioRef.current) {
        audioRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(() => {
            setIsPlaying(false);
        });
    }
  }, [isSeeking]);
  
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

  const handleNextSection = () => {
    if (!audioRef.current) return;
    const nextMark = sortedActiveMarks.find(mark => mark > currentTime + 0.5); 
    if (nextMark !== undefined) {
      seek(nextMark);
    } else {
      seek(duration);
    }
  };

  const handlePrevSection = () => {
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
  };
  
  const handleSkip = (amount: number) => {
    if (!audioRef.current) return;
    seek(currentTime + amount);
  };
  
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

  if (!hymn.recordings || hymn.recordings.length === 0) {
      return (
        <>
            <Card className="w-full max-w-3xl mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-3xl text-primary">
                        {hymn.name}
                    </CardTitle>
                    {hymn.description && (
                    <p className="text-muted-foreground mt-2 max-w-full">{hymn.description}</p>
                    )}
                    <p className="text-muted-foreground pt-4">No active recordings available for this hymn yet.</p>
                </CardHeader>
            </Card>
            <div className="w-full max-w-3xl mx-auto mt-8">
                <LyricsDisplay hymn={hymn} />
            </div>
        </>
      )
  }

  if (!currentRecording) {
     return (
        <>
            <Card className="w-full max-w-3xl mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-3xl text-primary">
                        {hymn.name}
                    </CardTitle>
                    {hymn.description && (
                    <p className="text-muted-foreground mt-2 max-w-full">{hymn.description}</p>
                    )}
                    <p className="text-muted-foreground pt-4">Please select a recording.</p>
                </CardHeader>
            </Card>
            <div className="w-full max-w-3xl mx-auto mt-8">
                <LyricsDisplay hymn={hymn} />
            </div>
        </>
      )
  }
  
  const isPlayerDisabled = !audioSrc || !!audioError;
  const showControls = currentRecording?.mode === 'learn';


  return (
    <>
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                  <CardTitle className="font-headline text-3xl text-primary">
                  {hymn.name}
                  </CardTitle>
                  {hymn.description && (
                    <p className="text-muted-foreground mt-2 max-w-full">{hymn.description}</p>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                    value={currentRecording.id}
                    onValueChange={(recId) => {
                    const newRec = hymn.recordings!.find((r) => r.id === recId);
                    if (newRec) setCurrentRecording(newRec);
                    }}
                >
                    <SelectTrigger className="w-[180px]">
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
                                  isRepeat ? "bg-green-600 text-white hover:bg-green-700" : "text-muted-foreground"
                              )}
                          >
                              <Repeat className="h-5 w-5" />
                              <span>Repeat Section</span>
                          </Button>
                      )}
                  </div>
                  
                  <div className="flex items-center gap-2 w-[100px] justify-end">
                      <Button variant="outline" onClick={handleSpeedChange} className="w-full">
                        <FastForward className="h-4 w-4 mr-1" />
                        <span>{playbackRate.toFixed(2)}x</span>
                      </Button>
                  </div>
              </div>
              {(onNext || onPrevious) && (
                <div className="flex justify-center items-center gap-4 border-t pt-4 mt-4">
                    <Button variant="outline" size="lg" onClick={onPrevious} disabled={!hasPrevious}>
                        <ChevronLeft className="mr-2 h-5 w-5" /> Previous Hymn
                    </Button>
                    <Button variant="outline" size="lg" onClick={onNext} disabled={!hasNext}>
                        Next Hymn <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
              )}
          </div>
          {isLoadingAudio && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <div className="w-full flex justify-between">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-12" />
                  </div>
                  <Skeleton className="h-10 w-40" />
              </div>
          )}
          {audioError && !isLoadingAudio && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                  <XCircle className="h-10 w-10 text-destructive mb-4" />
                  <p className="text-lg font-semibold text-destructive">Audio Failed to Load</p>
                  <p className="text-sm text-muted-foreground max-w-xs">{audioError}</p>
              </div>
          )}
        </CardContent>
      </Card>
      <div className="w-full max-w-3xl mx-auto mt-8">
        <LyricsDisplay hymn={hymn} />
      </div>
    </>
  );
}
