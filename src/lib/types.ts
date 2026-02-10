
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
  marks: number[];
  active: boolean;
  mode: 'learn' | 'listen';
}

export interface Hymn {
  id: string;
  name: string;
  genreId: string[];
  subGenreId?: { [key: string]: string };
  genreRank?: { [key: string]: number };
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
  active: boolean;
  subGenres?: string[];
  cantorCloudActive?: boolean;
}
