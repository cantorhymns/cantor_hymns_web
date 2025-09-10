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
import { Slider } from "@/components/ui/slider";
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
import { Badge } from "./ui/badge";

function formatTime(seconds: number) {
  const floorSeconds = Math.floor(seconds);
  const min = Math.floor(floorSeconds / 60);
  const sec = floorSeconds % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

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
  const [allMarksDisabled, setAllMarksDisabled] = useState(false);


  const audioRef = useRef<HTMLAudioElement>(null);
  const isSeeking = useRef(false);

  useEffect(() => {
    setCurrentRecording(hymn.recordings[0]);
    setPlaybackRate(1);
    setIsPlaying(false);
    setAllMarksDisabled(false);
  }, [hymn]);

  useEffect(() => {
    setActiveMarks(allMarksDisabled ? [] : currentRecording.marks);
    if (audioRef.current) {
      audioRef.current.src = currentRecording.url;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentRecording, allMarksDisabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => {
        if (!isSeeking.current) {
            setCurrentTime(audio.currentTime);
        }
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
    if (!isRepeat || !isPlaying || audioRef.current?.seeking || allMarksDisabled || sortedActiveMarks.length < 1) return;
  
    let startMark = 0;
    // Find the last mark that is before or at the current time
    for (let i = sortedActiveMarks.length - 1; i >= 0; i--) {
        if (sortedActiveMarks[i] <= currentTime) {
            startMark = sortedActiveMarks[i];
            break;
        }
    }
  
    let endMark = duration;
    // Find the next mark after the start mark
    for (const mark of sortedActiveMarks) {
        if (mark > startMark) {
            endMark = mark;
            break;
        }
    }

    // If there is no next mark, the section is from the last mark to the end of the song
    if(endMark === duration){
        const lastMark = sortedActiveMarks[sortedActiveMarks.length-1];
        if(currentTime < lastMark){
            endMark = lastMark;
        }
    }
  
    // When the current time passes the end mark, loop back to the start mark
    // Use a small buffer (0.5s) to avoid issues with timeupdate frequency
    if (currentTime >= endMark - 0.5 && endMark < duration) {
        if (audioRef.current) {
            audioRef.current.currentTime = startMark;
        }
    }
  
  }, [currentTime, isRepeat, isPlaying, sortedActiveMarks, duration, allMarksDisabled]);


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

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = value[0];
      isSeeking.current = false;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeekCommit = (value: number[]) => {
     if (audioRef.current) {
      const newTime = value[0];
      isSeeking.current = false;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }

  const handleNextSection = () => {
    if (!audioRef.current || allMarksDisabled) return;
    const nextMark = sortedActiveMarks.find(mark => mark > currentTime + 1); // +1 to avoid getting stuck on current mark
    if (nextMark !== undefined) {
      audioRef.current.currentTime = nextMark;
    } else {
      audioRef.current.currentTime = duration;
      setIsPlaying(false);
    }
  };

  const handlePrevSection = () => {
    if (!audioRef.current || allMarksDisabled) return;
    let prevMark = 0;
    // Find the last mark that is at least 1 second before the current time
    const reversedMarks = [...sortedActiveMarks].sort((a,b) => b-a);
    const foundMark = reversedMarks.find(mark => mark < currentTime - 1);
    
    if (foundMark !== undefined) {
      prevMark = foundMark;
    }

    audioRef.current.currentTime = prevMark;
  };

  const toggleMark = (mark: number) => {
    if (allMarksDisabled) return;
    setActiveMarks((prev) =>
      prev.includes(mark) ? prev.filter((m) => m !== mark) : [...prev, mark]
    );
  };

  const toggleAllMarks = () => {
    setAllMarksDisabled(prev => !prev);
  }

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
            <div className="relative w-full">
                <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={(value) => {
                        isSeeking.current = true;
                        setCurrentTime(value[0]);
                    }}
                    onValueCommit={handleSeekCommit}
                    className="w-full h-2"
                />
                {duration > 0 && currentRecording.marks.map((mark, index) => {
                    const isActive = activeMarks.includes(mark);
                    return (
                    <button
                        key={index}
                        onClick={() => toggleMark(mark)}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed"
                        style={{ left: `${(mark / duration) * 100}%` }}
                        aria-label={isActive ? `Disable mark at ${formatTime(mark)}` : `Enable mark at ${formatTime(mark)}`}
                        disabled={allMarksDisabled}
                    >
                        {isActive ? (
                            <CheckCircle2 className="w-4 h-4 text-primary bg-background rounded-full"/>
                        ) : (
                            <Circle className="w-4 h-4 text-muted-foreground bg-background rounded-full"/>
                        )}
                    </button>
                    );
                })}
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button
                        variant={isRepeat ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setIsRepeat(!isRepeat)}
                        className={isRepeat ? "text-primary ring-2 ring-primary" : ""}
                        disabled={allMarksDisabled}
                    >
                        <Repeat className="h-5 w-5" />
                        <span className="sr-only">Repeat Section</span>
                    </Button>
                     <Button
                        variant={allMarksDisabled ? "secondary" : "ghost"}
                        size="icon"
                        onClick={toggleAllMarks}
                        className={allMarksDisabled ? "text-primary ring-2 ring-primary" : ""}
                    >
                        <ListX className="h-5 w-5" />
                        <span className="sr-only">Disable All Marks</span>
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePrevSection} disabled={allMarksDisabled}>
                        <SkipBack className="h-6 w-6" />
                        <span className="sr-only">Previous Section</span>
                    </Button>
                    <Button size="icon" className="h-16 w-16 rounded-full" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNextSection} disabled={allMarksDisabled}>
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
