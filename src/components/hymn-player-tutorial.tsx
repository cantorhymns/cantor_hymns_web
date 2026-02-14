
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  SkipBack,
  SkipForward,
  Repeat,
  Type,
  Maximize2,
  MousePointer2,
} from 'lucide-react';
import { Button } from './ui/button';

const tutorialSteps = [
  {
    title: 'Learn vs. Listen Mode',
    description:
      'Recordings marked with a green dot are in "Learn Mode", with interactive sections. Others are for listening.',
    visual: () => (
      <div className="inline-flex flex-col items-start gap-2 rounded-lg border bg-background p-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
          <span className="font-medium">Learn Mode Cantor</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="text-muted-foreground">Listen Mode Cantor</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Navigate Sections',
    description:
      'In Learn Mode, use the skip buttons to jump between pre-defined sections of the hymn.',
    visual: () => (
        <div className="inline-flex flex-col items-center gap-3 rounded-lg border bg-background p-4">
            <div className="relative h-2 w-32 rounded-full bg-secondary">
                <div className="absolute h-2 w-2 top-0 left-1/2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
            <div className="flex items-center gap-6">
            <SkipBack className="h-6 w-6 text-muted-foreground" />
            <SkipForward className="h-6 w-6 text-muted-foreground" />
            </div>
        </div>
    ),
  },
  {
    title: 'Repeat Sections',
    description:
      'Enable the "Repeat Section" button to automatically loop the current audio segment.',
    visual: () => (
        <div className="inline-flex flex-col items-center gap-3 rounded-lg border bg-background p-4">
            <div className="relative h-2 w-full rounded-full bg-secondary" />
            <Button variant="outline" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Repeat className="h-4 w-4 mr-2" />
            <span>Repeat Section</span>
            </Button>
        </div>
    ),
  },
  {
    title: 'Customize The Loop',
    description:
      'Tap a section number to disable it, creating longer repeat sections.',
    visual: () => (
        <div className="relative inline-block rounded-lg border bg-background p-4 pt-8">
            <div className="relative h-2 w-32 rounded-md bg-secondary" />
            <div className="absolute top-1 flex w-full justify-between px-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
                <div className="relative flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground opacity-50">
                    2
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</div>
            </div>
            <MousePointer2 className="absolute right-10 top-2 h-5 w-5 text-primary" />
        </div>
    ),
  },
  {
    title: 'Adjust Lyrics View',
    description:
      'Use the text size and expand buttons to customize your lyrics display for easier reading.',
    visual: () => (
        <div className="inline-flex flex-col items-center gap-3 rounded-lg border bg-background p-4">
            <div className="h-12 w-32 rounded-md bg-secondary/50 p-2 text-[10px] text-muted-foreground">Lorem ipsum dolor sit amet...</div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7"><Type className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7"><Maximize2 className="h-4 w-4" /></Button>
            </div>
        </div>
    ),
  },
];


interface HymnPlayerTutorialProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HymnPlayerTutorial({ open, onOpenChange }: HymnPlayerTutorialProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Player Guide</DialogTitle>
          <DialogDescription>
            A quick guide to the hymn player features.
          </DialogDescription>
        </DialogHeader>
        <Carousel className="w-full max-w-xs mx-auto px-6">
            <CarouselContent>
              {tutorialSteps.map((step, index) => (
                <CarouselItem key={index}>
                    <div className="flex h-[350px] flex-col items-center justify-center p-1 text-center">
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                {step.visual()}
                            </div>
                            <div className="px-4">
                                <h3 className="font-semibold text-lg">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-1" />
            <CarouselNext className="-right-1" />
          </Carousel>
      </DialogContent>
    </Dialog>
  );
}
