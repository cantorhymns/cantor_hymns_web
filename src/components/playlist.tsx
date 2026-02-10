
'use client';
import { Hymn } from '@/lib/types';
import { ListMusic, Music } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function Playlist({
  playlist,
  currentIndex,
  onSelectTrack,
}: {
  playlist: Hymn[];
  currentIndex: number;
  onSelectTrack: (index: number) => void;
}) {
  if (!playlist || playlist.length === 0) {
    return null;
  }
  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
        <h3 className="mb-4 text-xl font-headline font-bold text-primary">Up Next</h3>
        <ScrollArea className="h-96 w-full rounded-md border">
        <div className="p-4">
            <div className="flex flex-col gap-2">
            {playlist.map((hymn, index) => (
                <Button
                key={`${hymn.id}-${index}`}
                variant="ghost"
                onClick={() => onSelectTrack(index)}
                className={cn(
                    "flex items-center justify-start gap-4 p-2 h-auto text-left transition-colors w-full",
                    index === currentIndex
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-accent/50"
                )}
                >
                <Music className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{hymn.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {hymn.recordings?.[0]?.cantor?.name || 'Unknown Cantor'}
                    </p>
                </div>
                {index === currentIndex && (
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
                </Button>
            ))}
            </div>
        </div>
        </ScrollArea>
    </div>
  );
}
