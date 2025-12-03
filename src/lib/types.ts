
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

export interface Cantor {
  id: string;
  name: string;
}

export interface Recording {
  id: string;
  hymnId: string;
  cantorId: string;
  cantor?: Cantor; // Optional, to be populated after fetching
  audioUrl: string;
  marks: number[];
}

export interface Hymn {
  id: string;
  name: string;
  genreId: string;
  recordings?: Recording[]; // Optional because they are fetched separately
}

export interface Genre {
  id:string;
  name: string;
  description: string;
  icon: string | ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
}
