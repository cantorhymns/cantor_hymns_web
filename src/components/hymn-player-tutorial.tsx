
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
import { Card, CardContent } from '@/components/ui/card';
import {
  SkipBack,
  SkipForward,
  Repeat,
  Type,
  Maximize2,
  MousePointer2,
} from 'lucide-react';

const tutorialSteps = [
  {
    title: 'Learn vs. Listen Mode',
    description:
      'Recordings marked with a green dot are in "Learn Mode", with interactive sections. Others are for listening.',
    visual: () => (
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
        <div className="flex items-center gap-3 rounded-md bg-secondary p-2">
          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
          <span className="font-medium">Learn Mode Cantor</span>
        </div>
        <div className="flex items-center gap-3 rounded-md p-2">
          <div className="h-2 w-2 flex-shrink-0" />
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
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-background p-4">
        <div className="h-12 w-full rounded-md bg-secondary" />
        <div className="flex items-center gap-4">
          <SkipBack className="h-8 w-8 text-muted-foreground" />
          <SkipForward className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    ),
  },
  {
    title: 'Repeat Sections',
    description:
      'Enable the "Repeat Section" button to automatically loop the current audio segment.',
    visual: () => (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-background p-4">
        <div className="h-12 w-full rounded-md bg-secondary" />
        <div className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-accent-foreground">
          <Repeat className="h-5 w-5" />
          <span>Repeat Section</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Customize The Loop',
    description:
      'Create longer repeat sections by tapping a section number above the timeline to disable it from the loop.',
    visual: () => (
      <div className="relative flex flex-col items-center gap-4 rounded-lg border bg-background p-4">
        <div className="h-12 w-full rounded-md bg-secondary">
          <div className="absolute left-[30%] top-6 h-10 w-0.5 bg-primary/50" />
          <div className="absolute left-[65%] top-6 h-10 w-0.5 bg-muted-foreground/50" />
        </div>
        <div className="flex items-center gap-8">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</div>
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground/50 text-xs font-bold text-muted-foreground">
                2
                <MousePointer2 className="absolute -right-3 -bottom-3 h-5 w-5 text-primary" />
            </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Adjust Lyrics View',
    description:
      'Use the text size and expand buttons to customize your lyrics display for easier reading.',
    visual: () => (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-background p-4">
         <div className="h-12 w-full rounded-md bg-secondary p-2 text-xs text-muted-foreground">Lorem ipsum dolor sit amet...</div>
         <div className="flex items-center gap-4">
            <Type className="h-6 w-6 text-muted-foreground" />
            <Maximize2 className="h-6 w-6 text-muted-foreground" />
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
        <div className="p-4">
          <Carousel className="w-full">
            <CarouselContent>
              {tutorialSteps.map((step, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex flex-col h-[400px] items-center justify-center p-6 gap-4">
                        <div className="w-full max-w-[200px]">
                            {step.visual()}
                        </div>
                        <div className="text-center">
                            <h3 className="font-semibold text-lg">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {step.description}
                            </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
