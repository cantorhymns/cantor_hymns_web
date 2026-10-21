import catalogData from '@/data/catalog.json';
import { Genre, Hymn, Cantor, Recording } from '@/lib/types';
import { useSyncExternalStore } from 'react';

export interface Catalog {
  generatedAt: string;
  genres: Genre[];
  cantors: Cantor[];
  hymns: Hymn[];
}

const STORAGE_CACHE_KEY = 'cantor_hymns_catalog_cache_v1';
export const FIREBASE_STORAGE_CATALOG_URL =
  'https://firebasestorage.googleapis.com/v0/b/studio-127742305-c9528.firebasestorage.app/o/data%2Fcatalog.json?alt=media';

const fallbackCatalog = catalogData as unknown as Catalog;
let activeCatalog: Catalog = fallbackCatalog;

// In-memory indexed caches for O(1) lookups
let genresMap = new Map<string, Genre>(activeCatalog.genres.map(g => [g.id, g]));
let cantorsMap = new Map<string, Cantor>(activeCatalog.cantors.map(c => [c.id, c]));
let hymnsMap = new Map<string, Hymn>(activeCatalog.hymns.map(h => [h.id, h]));

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in catalog listener', e);
    }
  });
}

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateCatalog(newCatalog: Catalog) {
  if (!newCatalog || !Array.isArray(newCatalog.hymns) || !Array.isArray(newCatalog.genres)) {
    return;
  }
  activeCatalog = newCatalog;
  genresMap = new Map<string, Genre>(activeCatalog.genres.map(g => [g.id, g]));
  cantorsMap = new Map<string, Cantor>(activeCatalog.cantors.map(c => [c.id, c]));
  hymnsMap = new Map<string, Hymn>(activeCatalog.hymns.map(h => [h.id, h]));
  notify();
}

/**
 * Fetch the latest live catalog directly from Firebase Storage.
 */
export async function fetchRemoteCatalog(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(FIREBASE_STORAGE_CATALOG_URL, {
      signal: controller.signal,
      cache: 'no-cache',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as Catalog;
      if (data && data.hymns && data.genres) {
        updateCatalog(data);
        try {
          localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
        } catch {
          // Ignore quota errors
        }
        return true;
      }
    }
  } catch (err) {
    // Graceful fallback to cached or bundled catalog
  }
  return false;
}

// Client-side initialization
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(STORAGE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Catalog;
      if (parsed && parsed.hymns && parsed.genres) {
        updateCatalog(parsed);
      }
    }
  } catch (err) {
    // Ignore invalid JSON in localStorage
  }

  // Trigger non-blocking background fetch from Firebase Storage
  fetchRemoteCatalog().catch(() => {});
}

export function useCatalog(): Catalog {
  return useSyncExternalStore(subscribeCatalog, getCatalog, () => fallbackCatalog);
}

export function getCatalog(): Catalog {
  return activeCatalog;
}

export function getGenres(): Genre[] {
  return activeCatalog.genres.filter(g => g.active !== false);
}

export function getGenre(genreId?: string): Genre | null {
  if (!genreId) return null;
  return genresMap.get(genreId) || null;
}

export function getCantors(): Cantor[] {
  return activeCatalog.cantors;
}

export function getCantor(cantorId?: string): Cantor | null {
  if (!cantorId) return null;
  return cantorsMap.get(cantorId) || null;
}

export function getAllRecordings(): Recording[] {
  const allRecordings: Recording[] = [];
  activeCatalog.hymns.forEach(hymn => {
    if (hymn.recordings) {
      allRecordings.push(...hymn.recordings);
    }
  });
  return allRecordings;
}

export function getHymns(genreId?: string, hymnIdsFilter?: string[]): Hymn[] {
  let hymns = activeCatalog.hymns;

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
