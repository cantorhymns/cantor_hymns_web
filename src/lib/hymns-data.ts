import type { Genre, Hymn } from '@/lib/types';
import { Church, Star, Sunrise, BookOpen, HeartHandshake } from 'lucide-react';

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
   {
    id: 'veneration',
    name: 'Veneration',
    description: 'Praises and hymns for the veneration of saints.',
    icon: HeartHandshake,
  },
];

const cantorOrder = ['Cantor Ibrahim', 'Cantor Gad', 'Cantor Tharwat', 'Cantor Bola', 'HICS'];

export const hymns: Hymn[] = [
  // Holy Week
  {
    id: 'tai-shouri',
    name: 'Tai Shouri',
    genre: 'holy-week',
    recordings: [
      { cantor: 'Cantor Tharwat', url: 'https://storage.googleapis.com/cantor_app_audio/CantorTharwat/CantorTharwat_MournfulTaishouri.mp3', marks: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210] },
      { cantor: 'Cantor Bola', url: 'https://storage.googleapis.com/cantor_app_audio/CantorBola/CantorBola_MournfulTaishouri.mp3', marks: [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180] },
      { cantor: 'HICS', url: 'https://storage.googleapis.com/cantor_app_audio/HICS/HICS_MournfulTaishouri.mp3', marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216] },
    ],
  },
  {
    id: 'omono-genees',
    name: 'Omonogenees',
    genre: 'holy-week',
    recordings: [
      { cantor: 'Cantor Bola', url: 'https://storage.googleapis.com/cantor_app_audio/CantorBola/CantorBola_Omonogenees.mp3', marks: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240] },
      { cantor: 'HICS', url: 'https://storage.googleapis.com/cantor_app_audio/HICS/HICS_Omonogenees.mp3', marks: [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180] },
    ],
  },
  {
    id: 'phai-etafenf',
    name: 'Phai Etafenf',
    genre: 'holy-week',
    recordings: [
       { cantor: 'Cantor Tharwat', url: 'https://storage.googleapis.com/cantor_app_audio/CantorTharwat/CantorTharwat_Phaietafenf.mp3', marks: [0, 19, 38, 57, 76, 95, 114, 133, 152, 171, 190, 209, 228] },
    ]
  },
  // Kiahk
  {
    id: 'el-tarh',
    name: 'El Tarh',
    genre: 'kiahk',
    recordings: [
      { cantor: 'Cantor Ibrahim', url: 'https://storage.googleapis.com/cantor_app_audio/CantorIbrahim/CantorIbrahim_Tar7.mp3', marks: [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170] },
      { cantor: 'Cantor Gad', url: 'https://storage.googleapis.com/cantor_app_audio/CantorGad/CantorGad_Tar7.mp3', marks: [0, 14, 28, 42, 56, 70, 84, 98, 112, 126, 140, 154, 168] },
    ],
  },
  // Resurrection
  {
    id: 'kata-ni-khoros',
    name: 'Kata Ni Khoros (El Hegab)',
    genre: 'resurrection',
    recordings: [
      { cantor: 'Cantor Ibrahim', url: 'https://storage.googleapis.com/cantor_app_audio/CantorIbrahim/CantorIbrahim_KataNiKhoros7egab.mp3', marks: [0, 16, 32, 48, 64, 80, 96, 112, 128, 144, 160] },
      { cantor: 'HICS', url: 'https://storage.googleapis.com/cantor_app_audio/HICS/HICS_KataNiKhoros7egab.mp3', marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180] },
    ],
  },
];

function sortRecordings(recordings: Hymn['recordings']): Hymn['recordings'] {
  return recordings.sort((a, b) => {
    const indexA = cantorOrder.indexOf(a.cantor);
    const indexB = cantorOrder.indexOf(b.cantor);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

hymns.forEach(hymn => {
    hymn.recordings = sortRecordings(hymn.recordings);
});


export function getHymnsByGenre(genreId: string): Hymn[] {
  return hymns.filter((hymn) => hymn.genre === genreId);
}

export function getHymnById(hymnId: string): Hymn | undefined {
  const hymn = hymns.find((hymn) => hymn.id === hymnId);
  if (hymn) {
    // Return a new object to avoid potential mutations of the original data
    return { ...hymn, recordings: sortRecordings([...hymn.recordings]) };
  }
  return undefined;
}

export function getGenreById(genreId: string): Genre | undefined {
    return genres.find((genre) => genre.id === genreId);
}
