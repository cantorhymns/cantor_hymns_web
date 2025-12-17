
"use client";

import type { Hymn, Recording } from "@/lib/types";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Rewind,
  XCircle,
} from "lucide-react";
import { getDownloadURL, ref } from "firebase/storage";
import { useFirebase, getStorage } from "@/firebase";
import { Skeleton } from "./ui/skeleton";

function formatTime(seconds: number) {
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

const VISIBLE_DURATION_S = 60; // 1 minute window

export function HymnPlayer({ hymn }: { hymn: Hymn }) {
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
  const seekStartRef = useRef({ x: 0, time: 0 });
  const loopSectionRef = useRef<{ start: number, end: number } | null>(null);

  const sortedMarks = useMemo(() => [...(currentRecording?.marks || [])].sort((a, b) => a - b), [currentRecording]);
  const sortedActiveMarks = useMemo(() => [...activeMarks].sort((a, b) => a - b), [activeMarks]);

  useEffect(() => {
    const firstRecording = hymn.recordings?.[0];
    setCurrentRecording(firstRecording);
  }, [hymn]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackRate(1);
    setAudioSrc(null);
    setAudioError(null);
    setDuration(0);
    setActiveMarks(currentRecording?.marks || []);

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
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current || duration <= 0) return;
    const newTime = Math.max(0, Math.min(time, duration));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);
  
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

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
      const currentSectionStart = [...sortedActiveMarks].reverse().find(mark => mark <= currentTime);
      const currentSectionEnd = sortedActiveMarks.find(mark => mark > (currentSectionStart ?? -1));

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

  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (target.closest('[data-marker-toggle]')) {
      return;
    }
    setIsSeeking(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    if (!waveformContainerRef.current || !waveformInnerRef.current || !audioRef.current || duration <= 0) return;

    seekStartRef.current = { x: clientX, time: audioRef.current.currentTime };
    
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
  };

  const handleSeekMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isSeeking || !audioRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

    if (!waveformContainerRef.current || !waveformInnerRef.current || duration <= 0) return;
    
    const dragDeltaX = clientX - seekStartRef.current.x;
    
    const scrollerWidth = waveformInnerRef.current.scrollWidth;
    const timePerPixel = duration / scrollerWidth;
    const timeDelta = dragDeltaX * timePerPixel;
    
    const newTime = seekStartRef.current.time + timeDelta;

    if (audioRef.current) {
        const newClampedTime = Math.max(0, Math.min(newTime, duration));
        audioRef.current.currentTime = newClampedTime;
        setCurrentTime(newClampedTime);
    }
  }, [isSeeking, duration]);

  const handleSeekEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isSeeking) return;
    e.preventDefault();
    setIsSeeking(false);
    
    if(audioRef.current) {
      seek(audioRef.current.currentTime);
    }
  }, [isSeeking, seek]);
  
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
        <Card className="w-full max-w-3xl mx-auto shadow-xl">
            <CardHeader>
                <CardTitle className="font-headline text-3xl text-primary">
                    {hymn.name}
                </CardTitle>
                <CardDescription>No recordings available for this hymn yet.</CardDescription>
            </CardHeader>
        </Card>
      )
  }

  if (!currentRecording) {
     return (
        <Card className="w-full max-w-3xl mx-auto shadow-xl">
            <CardHeader>
                <CardTitle className="font-headline text-3xl text-primary">
                    {hymn.name}
                </CardTitle>
                <CardDescription>Please select a recording.</CardDescription>
            </CardHeader>
        </Card>
      )
  }
  
  const isPlayerDisabled = !audioSrc || !!audioError;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}
      <CardHeader>
        <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
                <CardTitle className="font-headline text-3xl text-primary">
                {hymn.name}
                </CardTitle>
                <CardDescription className="mt-1">{currentRecording.cantor?.name || 'Unknown Cantor'}</CardDescription>
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
                      {rec.cantor?.name || `Rec: ${rec.id.substring(0,4)}`}
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
                     {duration > 0 && sortedMarks.map((mark, index) => {
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
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant={isRepeat ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setIsRepeat(!isRepeat)}
                            className={`${isRepeat ? "text-primary ring-2 ring-primary" : ""}`}
                        >
                            <Repeat className="h-5 w-5" />
                            <span className="sr-only">Repeat Section</span>
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground">Learn Mode</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handlePrevSection} disabled={sortedActiveMarks.length === 0}>
                            <SkipBack className="h-6 w-6" />
                            <span className="sr-only">Previous Section</span>
                        </Button>
                        <Button size="icon" className="h-16 w-16 rounded-full" onClick={handlePlayPause}>
                            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                            <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                        </Button>
                         <Button variant="ghost" size="icon" onClick={handleNextSection} disabled={sortedActiveMarks.length === 0}>
                            <SkipForward className="h-6 w-6" />
                            <span className="sr-only">Next Section</span>
                        </Button>
                    </div>
                    <div className="flex items-center gap-6 mt-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleSkip(-10)}>
                            <Rewind className="h-6 w-6" />
                            <span className="sr-only">Rewind 10 seconds</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleSkip(10)}>
                            <FastForward className="h-6 w-6" />
                            <span className="sr-only">Fast Forward 10 seconds</span>
                        </Button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-[100px] justify-end">
                    <Select value={String(playbackRate)} onValueChange={(val) => setPlaybackRate(Number(val))}>
                        <SelectTrigger className="w-full">
                            <FastForward className="h-4 w-4 mr-1 text-muted-foreground"/>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                                <SelectItem key={speed} value={String(speed)}>{speed.toFixed(2)}x</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
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
  );
}
