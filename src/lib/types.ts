
import type { LucideIcon, LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

export interface Recording {
  id: string;
  hymnId: string;
  cantor: string;
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
