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
  Check,
} from "lucide-react";

function formatTime(seconds: number) {
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

const VISIBLE_DURATION_S = 60; // 1 minute window

export function HymnPlayer({ hymn }: { hymn: Hymn }) {
  const [currentRecording, setCurrentRecording] = useState<Recording>(
    hymn.recordings[0]
  );
  const [activeMarks, setActiveMarks] = useState<number[]>(
    currentRecording.marks
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const waveformInnerRef = useRef<HTMLDivElement>(null);
  const seekStartRef = useRef({ x: 0, time: 0 });

  useEffect(() => {
    setCurrentRecording(hymn.recordings[0]);
    setPlaybackRate(1);
    setIsPlaying(false);
  }, [hymn]);

  useEffect(() => {
    setActiveMarks(currentRecording.marks);
    if (audioRef.current) {
      audioRef.current.src = currentRecording.url;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentRecording]);
  
  const sortedActiveMarks = useMemo(() => [...activeMarks].sort((a, b) => a - b), [activeMarks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => {
        if (!isSeeking) {
            setCurrentTime(audio.currentTime);
        }
    };
    
    const handleEnded = () => {
        setIsPlaying(false);
        if (isRepeat) {
            const activeLoopMarks = sortedActiveMarks;
            if (activeLoopMarks.length > 0) {
                audio.currentTime = activeLoopMarks[0];
                audio.play();
                setIsPlaying(true);
            } else {
                 audio.currentTime = 0;
            }
        }
    };

    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isSeeking, isRepeat, sortedActiveMarks]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!isRepeat || !isPlaying || isSeeking) return;
  
    const activeLoopMarks = sortedActiveMarks;
    if (activeLoopMarks.length < 2) return;
  
    let startMark: number | undefined;
    let endMark: number | undefined;

    for (let i = 0; i < activeLoopMarks.length; i++) {
        if (activeLoopMarks[i] > currentTime) {
            endMark = activeLoopMarks[i];
            const prevIndex = i - 1;
            if (prevIndex >= 0) {
               startMark = activeLoopMarks[prevIndex]
            } else {
               startMark = 0;
            }
            break;
        }
    }
    
    if (endMark === undefined && activeLoopMarks.length > 0) {
        const lastMark = activeLoopMarks[activeLoopMarks.length - 1];
        if(currentTime > lastMark){
            startMark = lastMark;
            endMark = duration;
        }
    }


    if (startMark !== undefined && endMark !== undefined && currentTime >= endMark - 0.2) {
       if (audioRef.current) {
          audioRef.current.currentTime = startMark;
       }
    }

  }, [currentTime, isRepeat, isPlaying, sortedActiveMarks, duration, isSeeking]);

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


  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audio.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const seek = useCallback((time: number) => {
    if (!audioRef.current || duration <= 0) return;
    const newTime = Math.max(0, Math.min(time, duration));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [duration]);

  const handleSeekStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSeeking(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
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
    seekStartRef.current = { x: clientX, time: newTime };
  };

  const handleSeekMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    if (!waveformContainerRef.current || !waveformInnerRef.current || !audioRef.current || duration <= 0) return;

    const dragDeltaX = clientX - seekStartRef.current.x;
    const timePerPixel = (duration / waveformInnerRef.current.scrollWidth);
    const timeDelta = dragDeltaX * timePerPixel;
    
    const newTime = seekStartRef.current.time + timeDelta;
    
    const clampedTime = Math.min(duration, Math.max(0, newTime));
    setCurrentTime(clampedTime);

  }, [isSeeking, duration]);

  const handleSeekEnd = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    e.preventDefault();
    if(audioRef.current) {
        audioRef.current.currentTime = currentTime;
    }
    setIsSeeking(false);
  };
  
  const handleNextSection = () => {
    if (!audioRef.current) return;
    const nextMark = sortedActiveMarks.find(mark => mark > currentTime + 1);
    if (nextMark !== undefined) {
      audioRef.current.currentTime = nextMark;
    } else {
      audioRef.current.currentTime = duration;
      setIsPlaying(false);
    }
  };

  const handlePrevSection = () => {
    if (!audioRef.current) return;
    const prevMark = [...sortedActiveMarks].reverse().find(mark => mark < currentTime - 1);
     if (prevMark === undefined) {
      audioRef.current.currentTime = 0;
      return;
    }
    audioRef.current.currentTime = prevMark;
  };

  const toggleMark = (mark: number) => {
    setActiveMarks((prev) =>
      prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark]
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
       const progress = (currentTime - scrollEndTime) / (VISIBLE_DURATION_S / 2);
       return { left: `${50 + progress * 50}%` };
    }

    return { left: '50%' };

  }, [currentTime, duration]);
  
  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <audio ref={audioRef} src={currentRecording.url} preload="metadata" />
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-3xl text-primary">
                {hymn.name}
                </CardTitle>
                <CardDescription className="mt-1">{currentRecording.cantor}</CardDescription>
            </div>
            <Select
                value={currentRecording.cantor}
                onValueChange={(cantorName) => {
                const newRec = hymn.recordings.find((r) => r.cantor === cantorName);
                if (newRec) setCurrentRecording(newRec);
                }}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Cantor" />
                </SelectTrigger>
                <SelectContent>
                {hymn.recordings.map((rec) => (
                    <SelectItem key={rec.cantor} value={rec.cantor}>
                    {rec.cantor}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-6">
           <div 
                ref={waveformContainerRef} 
                className="relative w-full h-20 bg-secondary/50 rounded-lg cursor-pointer group touch-none overflow-hidden"
                onMouseDown={handleSeekStart}
                onMouseMove={handleSeekMove}
                onMouseUp={handleSeekEnd}
                onMouseLeave={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchMove={handleSeekMove}
                onTouchEnd={handleSeekEnd}
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
                       const barHeight = Math.random() * 60 + 20;
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
                     {duration > 0 && currentRecording.marks.map((mark, index) => {
                        const isActive = activeMarks.includes(mark);
                        return (
                        <div
                            key={index}
                            className="absolute top-0 -translate-x-1/2 h-full z-20 flex flex-col items-center"
                            style={{ left: `${(mark / duration) * 100}%` }}
                        >
                            <button
                                onMouseDown={(e) => { e.stopPropagation(); }}
                                onTouchStart={(e) => { e.stopPropagation(); }}
                                onClick={(e) => { e.stopPropagation(); toggleMark(mark); }}
                                className="absolute -top-5 w-8 h-8 focus:outline-none flex items-center justify-center text-xs font-bold"
                                aria-label={isActive ? `Disable mark at ${formatTime(mark)}` : `Enable mark at ${formatTime(mark)}`}
                            >
                              {isActive && <Check className="h-5 w-5 text-primary" />}
                            </button>
                            <div className={`w-4 h-full pointer-events-none transition-colors ${isActive ? 'bg-primary/75' : 'bg-muted-foreground/50'}`}>
                              <div className="h-full w-full flex items-center justify-center text-primary-foreground font-bold text-xs">
                                {index + 1}
                              </div>
                            </div>
                        </div>
                        );
                    })}

                </div>

                <div 
                    className="absolute top-0 h-full w-0.5 bg-red-500 z-30 pointer-events-none -translate-x-1/2"
                    style={playheadPositionStyle}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 w-[100px]">
                    <Button
                        variant={isRepeat ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsRepeat(!isRepeat)}
                        className={isRepeat ? "text-primary ring-2 ring-primary" : ""}
                    >
                        <Repeat className="h-5 w-5" />
                        <span className="sr-only">Repeat Section</span>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePrevSection}>
                        <SkipBack className="h-6 w-6" />
                        <span className="sr-only">Previous Section</span>
                    </Button>
                    <Button size="icon" className="h-16 w-16 rounded-full" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNextSection}>
                        <SkipForward className="h-6 w-6" />
                        <span className="sr-only">Next Section</span>
                    </Button>
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
      </CardContent>
    </Card>
  );
}
