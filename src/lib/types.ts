
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

export interface Cantor {
  id: string;
  name: string;
  rank: number;
  cantorCloudActive?: boolean;
}

export interface Recording {
  id: string;
  hymnId: string;
  cantorId: string;
  cantor?: Cantor; // Optional, to be populated after fetching
  audioUrl: string;
  /** Path to the markers text file in Storage. This is the source of truth for "learn" mode. */
  markersUrl: string;
  active: boolean;
  mode: 'learn' | 'listen';
  audioLength?: number;
}

export interface Hymn {
  id: string;
  name: string;
  genreId: string[];
  description?: string;
  lyricsEnglish?: string;
  lyricsCoptic?: string;
  lyricsArabic?: string;
  recordings?: Recording[]; // Optional because they are fetched separately
}

export interface Genre {
  id:string;
  name: string;
  rank: number;
  description: string;
  icon: string;
  backgroundUrl?: string;
  contentUrl?: string;
  active: boolean;
  cantorCloudActive?: boolean;
}
