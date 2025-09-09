export interface Recording {
  cantor: string;
  url: string;
  marks: number[];
}

export interface Hymn {
  id: string;
  name: string;
  genre: string;
  recordings: Recording[];
}

export interface Genre {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}
