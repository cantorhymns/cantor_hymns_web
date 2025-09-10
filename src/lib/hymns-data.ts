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
      { cantor: 'Cantor Tharwat', url: 'https://storage.googleapis.com/cantor_app_audio/CantorTharwat/CantorTharwat_MournfulTaishouri.mp3', marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 252, 270, 288, 306, 324, 342, 360, 378, 396, 414, 432, 450, 468, 486, 504, 522] },
      { cantor: 'Cantor Bola', url: 'https://storage.googleapis.com/cantor_app_audio/CantorBola/CantorBola_MournfulTaishouri.mp3', marks: [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255, 272, 289, 306, 323, 340, 357, 374, 391, 408, 425, 442, 459, 476, 493, 510] },
      { cantor: 'HICS', url: 'https://storage.googleapis.com/cantor_app_audio/HICS/HICS_MournfulTaishouri.mp3', marks: [0, 19, 38, 57, 76, 95, 114, 133, 152, 171, 190, 209, 228, 247, 266, 285, 304, 323, 342, 361, 380, 399, 418, 437, 456, 475, 494, 513, 532, 551] },
    ],
  },
  {
    id: 'omono-genees',
    name: 'Omonogenees',
    genre: 'holy-week',
    recordings: [
      { cantor: 'Cantor Bola', url: 'https://storage.googleapis.com/cantor_app_audio/CantorBola/CantorBola_Omonogenees.mp3', marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 252, 270, 288, 306, 324, 342] },
      { cantor: 'HICS', url: 'https://storage.googleapis.com/cantor_app_audio/HICS/HICS_Omonogenees.mp3', marks: [0, 19, 38, 57, 76, 95, 114, 133, 152, 171, 190, 209, 228, 247, 266, 285, 304, 323] },
    ],
  },
  {
    id: 'phai-etafenf',
    name: 'Phai Etafenf',
    genre: 'holy-week',
    recordings: [
       { cantor: 'Cantor Tharwat', url: 'https://storage.googleapis.com/cantor_app_audio/CantorTharwat/CantorTharwat_Phaietafenf.mp3', marks: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500, 520, 540, 560] },
    ]
  },
  // Kiahk
  {
    id: 'el-tarh',
    name: 'El Tarh',
    genre: 'kiahk',
    recordings: [
      { cantor: 'Cantor Ibrahim', url: 'https://storage.googleapis.com/cantor_app_audio/CantorIbrahim/CantorIbrahim_Tar7.mp3', marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 252, 270, 288, 306, 324, 342, 360, 378, 396, 414, 432, 450, 468, 486, 504, 522, 540, 558, 576, 594, 612, 630, 648, 666, 684, 702, 720, 738, 756, 774, 792, 810, 828, 846, 864, 882, 900, 918, 936, 954, 972, 990, 1008, 1026, 1044, 1062, 1080, 1098, 1116, 1134, 1152, 1170, 1188, 1206, 1224, 1242, 1260, 1278, 1296, 1314, 1332, 1350, 1368, 1386, 1404, 1422, 1440, 1458, 1476, 1494, 1512, 1530, 1548, 1566, 1584, 1602] },
      { cantor: 'Cantor Gad', url: 'https://storage.googleapis.com/cantor_app_audio/CantorGad/CantorGad_Tar7.mp3', marks: [0, 19, 38, 57, 76, 95, 114, 133, 152, 171, 190, 209, 228, 247, 266, 285, 304, 323, 342, 361, 380, 399, 418, 437, 456, 475, 494, 513, 532, 551, 570, 589, 608, 627, 646, 665, 684, 703, 722, 741, 760, 779, 798, 817, 836, 855, 874, 893, 912, 931, 950, 969, 988, 1007, 1026, 1045, 1064, 1083, 1102, 1121, 1140, 1159, 1178, 1197, 1216, 1235, 1254, 1273, 1292, 1311, 1330, 1349, 1368, 1387, 1406, 1425, 1444, 1463, 1482, 1501, 1520, 1539, 1558, 1577, 1596, 1615] },
    ],
  },
  // Resurrection
  {
    id: 'kata-ni-khoros',
    name: 'Kata Ni Khoros (El Hegab)',
    genre: 'resurrection',
    recordings: [
      { cantor: 'Cantor Ibrahim', url: 'https://storage.googleapis.com/cantor_app_audio/CantorIbrahim/CantorIbrahim_KataNiKhoros7egab.mp3', marks: [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 252, 270, 288, 306, 324, 342, 360, 378, 396, 414, 432, 450] },
      { cantor: 'HICS', url: 'https://storage.googleapis.com/cantor_app_audio/HICS/HICS_KataNiKhoros7egab.mp3', marks: [0, 19, 38, 57, 76, 95, 114, 133, 152, 171, 190, 209, 228, 247, 266, 285, 304, 323, 342, 361, 380, 399, 418, 437, 456, 475] },
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
