import type { Genre, Hymn } from '@/lib/types';
import { Church, Star, Sunrise, BookOpen } from 'lucide-react';

export const genres: Genre[] = [
  {
    id: 'holy-week',
    name: 'Holy Week',
    description: 'Chants and hymns from the solemn and reflective period of Passion Week.',
    icon: Church,
  },
  {
    id: 'kiahk',
    name: 'Kiahk',
    description: 'Praises for the Virgin Mary, chanted during the month leading up to Nativity.',
    icon: Star,
  },
  {
    id: 'resurrection',
    name: 'Resurrection',
    description: 'Joyful hymns celebrating the Resurrection of Christ, featured in the Bright Saturday liturgy.',
    icon: Sunrise,
  },
];

const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // Approx 4:21 (261s)

export const hymns: Hymn[] = [
  // Holy Week
  {
    id: 'tai-shouri',
    name: 'Tai Shouri',
    genre: 'holy-week',
    recordings: [
      { cantor: 'Cantor Tharwat', url: audioUrl, marks: [0, 25, 50, 78, 100, 130, 160, 195, 220, 250] },
      { cantor: 'Cantor Ibrahim', url: audioUrl, marks: [0, 22, 48, 75, 105, 135, 165, 198, 225, 255] },
      { cantor: 'Cantor Gad', url: audioUrl, marks: [0, 28, 55, 80, 110, 140, 170, 200, 230, 260] },
    ],
  },
  {
    id: 'agios',
    name: 'Agios',
    genre: 'holy-week',
    recordings: [
      { cantor: 'Cantor Tharwat', url: audioUrl, marks: [0, 30, 60, 90, 120, 150, 180, 210, 240] },
      { cantor: 'Cantor Ibrahim', url: audioUrl, marks: [0, 32, 64, 96, 128, 160, 192, 224, 256] },
      { cantor: 'Cantor Gad', url: audioUrl, marks: [0, 28, 56, 84, 112, 140, 168, 196, 224] },
    ],
  },
  {
    id: 'omono-genees',
    name: 'Omonogenees',
    genre: 'holy-week',
    recordings: [
      { cantor: 'Cantor Tharwat', url: 'https://storage.googleapis.com/cantor_app_audio/CantorTharwat/HolyWeek/Omonogenees.mp3', marks: [0, 40, 80, 120, 160, 200, 240] },
      { cantor: 'Cantor Ibrahim', url: audioUrl, marks: [0, 45, 90, 135, 180, 225] },
      { cantor: 'Cantor Gad', url: audioUrl, marks: [0, 38, 76, 114, 152, 190, 228] },
    ],
  },
  // Kiahk
  {
    id: 'ten-ou-osht',
    name: 'Major Ten ou-osht',
    genre: 'kiahk',
    recordings: [
      { cantor: 'Cantor Tharwat', url: audioUrl, marks: [0, 50, 100, 150, 200, 250] },
      { cantor: 'Cantor Ibrahim', url: audioUrl, marks: [0, 55, 110, 165, 220] },
      { cantor: 'Cantor Gad', url: audioUrl, marks: [0, 48, 96, 144, 192, 240] },
    ],
  },
  // Resurrection
  {
    id: 'kata-ni-khoros',
    name: 'Major Kata ni khoros',
    genre: 'resurrection',
    recordings: [
      { cantor: 'Cantor Tharwat', url: audioUrl, marks: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240] },
      { cantor: 'Cantor Ibrahim', url: audioUrl, marks: [0, 22, 44, 66, 88, 110, 132, 154, 176, 198, 220, 242] },
      { cantor: 'Cantor Gad', url: audioUrl, marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216] },
    ],
  },
];

export function getHymnsByGenre(genreId: string): Hymn[] {
  return hymns.filter((hymn) => hymn.genre === genreId);
}

export function getHymnById(hymnId: string): Hymn | undefined {
  return hymns.find((hymn) => hymn.id === hymnId);
}

export function getGenreById(genreId: string): Genre | undefined {
    return genres.find((genre) => genre.id === genreId);
}
