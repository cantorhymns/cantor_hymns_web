"use client";

import type { Hymn, Recording } from "@/lib/types";
import { useState, useRef, useEffect, useMemo } from "react";
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
  CheckCircle2,
  Circle,
  ListX
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const waveformInnerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => {
        setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const sortedActiveMarks = useMemo(() => [...activeMarks].sort((a, b) => a - b), [activeMarks]);

  useEffect(() => {
    if (!isRepeat || !isPlaying || audioRef.current?.seeking) return;
  
    const activeLoopMarks = sortedActiveMarks;
    if (activeLoopMarks.length < 1) return;
  
    let startMark = 0;
    for (let i = activeLoopMarks.length - 1; i >= 0; i--) {
      if (activeLoopMarks[i] <= currentTime) {
        startMark = activeLoopMarks[i];
        break;
      }
    }
  
    let endMark = duration;
    const nextMarkIndex = activeLoopMarks.findIndex(m => m > currentTime);
    if (nextMarkIndex !== -1) {
      endMark = activeLoopMarks[nextMarkIndex];
    }
  
    if (currentTime >= endMark - 0.1 && endMark > startMark) {
      if (audioRef.current) {
        audioRef.current.currentTime = startMark;
      }
    }
  }, [currentTime, isRepeat, isPlaying, sortedActiveMarks, duration]);

  // Animate the waveform scroll
  useEffect(() => {
    if (waveformInnerRef.current && duration > 0) {
      const scrollOffset = Math.max(0, currentTime - VISIBLE_DURATION_S / 2);
      const translatePercentage = -(scrollOffset / duration) * 100;
      waveformInnerRef.current.style.transform = `translateX(${translatePercentage}%)`;
    }
  }, [currentTime, duration]);


  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && waveformContainerRef.current && duration > 0) {
      const rect = waveformContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const containerWidth = waveformContainerRef.current.offsetWidth;
      
      const scrollOffset = Math.max(0, currentTime - VISIBLE_DURATION_S / 2);
      const newTime = scrollOffset + (clickX / containerWidth) * VISIBLE_DURATION_S;
      
      audioRef.current.currentTime = Math.min(duration, Math.max(0, newTime));
    }
  };
  
  const handleNextSection = () => {
    if (!audioRef.current) return;
    const nextMark = sortedActiveMarks.find(mark => mark > currentTime + 1); // +1 to avoid getting stuck on current mark
    if (nextMark !== undefined) {
      audioRef.current.currentTime = nextMark;
    } else {
      audioRef.current.currentTime = duration;
      setIsPlaying(false);
    }
  };

  const handlePrevSection = () => {
    if (!audioRef.current || currentTime < 1) {
        if(audioRef.current) audioRef.current.currentTime = 0;
        return;
    };
    // Find the mark right before the current time
    const prevMark = [...sortedActiveMarks].reverse().find(mark => mark < currentTime - 1);
    audioRef.current.currentTime = prevMark !== undefined ? prevMark : 0;
  };

  const toggleMark = (mark: number) => {
    setActiveMarks((prev) =>
      prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark]
    );
  };
  
  const waveformContainerWidth = duration > 0 ? (duration / VISIBLE_DURATION_S) * 100 : 100;
  
  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden shadow-xl">
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
                className="relative w-full h-20 bg-secondary/50 rounded-lg overflow-hidden cursor-pointer group"
                onClick={handleSeek}
            >
                <div 
                    ref={waveformInnerRef}
                    className="absolute top-0 left-0 h-full"
                    style={{
                        width: `${waveformContainerWidth}%`,
                        willChange: 'transform',
                    }}
                >
                    {/* Background Waveform Bars */}
                    {duration > 0 && Array.from({ length: Math.ceil(duration) }).map((_, i) => {
                       const barHeight = Math.random() * 60 + 20; // Random height between 20% and 80%
                       return (
                          <div
                            key={i}
                            className="absolute bottom-0 w-0.5 bg-muted/50"
                            style={{
                                left: `${(i / duration) * 100}%`,
                                height: `${barHeight}%`,
                            }}
                          />
                       )
                    })}

                    {/* Markers */}
                    {duration > 0 && currentRecording.marks.map((mark, index) => {
                        const isActive = activeMarks.includes(mark);
                        return (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleMark(mark);
                            }}
                            className="absolute bottom-0 -translate-x-1/2 w-4 h-full focus:outline-none z-10"
                            style={{ left: `${(mark / duration) * 100}%` }}
                            aria-label={isActive ? `Disable mark at ${formatTime(mark)}` : `Enable mark at ${formatTime(mark)}`}
                        >
                             <div className={`w-0.5 h-full mx-auto ${isActive ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
                             <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                                {isActive ? (
                                    <CheckCircle2 className="w-4 h-4 text-primary bg-background rounded-full"/>
                                ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground bg-background rounded-full"/>
                                )}
                            </div>
                        </button>
                        );
                    })}
                </div>
                {/* Playhead */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-red-500 z-20 pointer-events-none">
                    <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-red-500 rounded-full"></div>
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
                            {[...Array(11)].map((_, i) => {
                                const speed = 1.0 + i * 0.1;
                                return <SelectItem key={speed} value={String(speed)}>{speed.toFixed(1)}x</SelectItem>
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

    