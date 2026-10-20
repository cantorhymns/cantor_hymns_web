import catalogData from '@/data/catalog.json';
import { Genre, Hymn, Cantor, Recording } from '@/lib/types';

export interface Catalog {
  generatedAt: string;
  genres: Genre[];
  cantors: Cantor[];
  hymns: Hymn[];
}

const rawCatalog = catalogData as unknown as Catalog;

// In-memory indexed caches for O(1) lookups
const genresMap = new Map<string, Genre>(rawCatalog.genres.map(g => [g.id, g]));
const cantorsMap = new Map<string, Cantor>(rawCatalog.cantors.map(c => [c.id, c]));
const hymnsMap = new Map<string, Hymn>(rawCatalog.hymns.map(h => [h.id, h]));

export function getCatalog(): Catalog {
  return rawCatalog;
}

export function getGenres(): Genre[] {
  return rawCatalog.genres.filter(g => g.active !== false);
}

export function getGenre(genreId?: string): Genre | null {
  if (!genreId) return null;
  return genresMap.get(genreId) || null;
}

export function getCantors(): Cantor[] {
  return rawCatalog.cantors;
}

export function getCantor(cantorId?: string): Cantor | null {
  if (!cantorId) return null;
  return cantorsMap.get(cantorId) || null;
}

export function getAllRecordings(): Recording[] {
  const allRecordings: Recording[] = [];
  rawCatalog.hymns.forEach(hymn => {
    if (hymn.recordings) {
      allRecordings.push(...hymn.recordings);
    }
  });
  return allRecordings;
}

export function getHymns(genreId?: string, hymnIdsFilter?: string[]): Hymn[] {
  let hymns = rawCatalog.hymns;

  if (genreId) {
    hymns = hymns.filter(h => Array.isArray(h.genreId) && h.genreId.includes(genreId));
  }

  if (hymnIdsFilter && hymnIdsFilter.length > 0) {
    const filterSet = new Set(hymnIdsFilter);
    hymns = hymns.filter(h => filterSet.has(h.id));
  }

  return hymns;
}

export function getHymn(hymnId?: string): Hymn | null {
  if (!hymnId) return null;
  return hymnsMap.get(hymnId) || null;
}
