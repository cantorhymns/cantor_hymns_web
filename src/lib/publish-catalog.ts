import { Firestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import defaultCatalog from '@/data/catalog.json';

const fallbackHymnsMap = new Map<string, any>((defaultCatalog.hymns as any[]).map(h => [h.id, h]));
const fallbackGenresMap = new Map<string, any>(((defaultCatalog as any).genres || []).map((g: any) => [g.id, g]));

export interface PublishResult {
  success: boolean;
  generatedAt: string;
  downloadUrl: string;
  counts: {
    cantors: number;
    genres: number;
    hymns: number;
    recordings: number;
  };
  fileSizeKb: number;
}

export async function compileAndPublishCatalog(
  firestore: Firestore,
  storage: FirebaseStorage,
  onProgress?: (status: string) => void
): Promise<PublishResult> {
  onProgress?.('Fetching cantors from Cloud Firestore...');
  const cantorsSnap = await getDocs(collection(firestore, 'cantors'));
  const cantors = cantorsSnap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      active: data.active !== false,
    };
  });
  cantors.sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99));

  onProgress?.('Fetching liturgical seasons & genres...');
  const genresSnap = await getDocs(collection(firestore, 'genres'));
  const rawGenres = genresSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const genres = await Promise.all(
    rawGenres.map(async (genreData: any) => {
      const fallbackGenre = fallbackGenresMap.get(genreData.id);
      let content: string = genreData.content || fallbackGenre?.content || '';

      if (!content && genreData.contentUrl) {
        try {
          const contentRef = ref(storage, genreData.contentUrl);
          const url = await getDownloadURL(contentRef);
          const res = await fetch(url);
          if (res.ok) {
            content = (await res.text()).trim();
          }
        } catch (fetchErr) {
          console.warn(`Could not fetch content for genre ${genreData.id}:`, fetchErr);
        }
      }

      const { contentUrl, ...restGenre } = genreData;
      return {
        ...restGenre,
        ...(content ? { content } : {}),
      };
    })
  );
  genres.sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99));

  onProgress?.('Fetching recordings & audio track markers...');
  const recordingsSnap = await getDocs(collection(firestore, 'recordings'));
  const recordings = recordingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Index cantors for fast lookup
  const cantorMap = new Map<string, any>();
  cantors.forEach((c: any) => cantorMap.set(c.id, c));

  // Group recordings by hymnId
  const recordingsByHymn = new Map<string, any[]>();
  for (const rec of recordings as any[]) {
    const hymnId = rec.hymnId;
    if (!hymnId) continue;
    if (!recordingsByHymn.has(hymnId)) {
      recordingsByHymn.set(hymnId, []);
    }
    const cantorInfo = cantorMap.get(rec.cantorId) || {
      id: rec.cantorId,
      name: rec.cantorId,
      cantorCloudActive: true,
    };

    const recMarkers: number[] = Array.isArray(rec.markers) ? rec.markers : [];
    const recMode = recMarkers.length > 0 ? 'learn' : (rec.mode || 'learn');
    const markersUrl = rec.markersUrl || `markers/${rec.cantorId}/${rec.id}_markers.txt`;

    // Ensure Firebase Storage has the markers.txt and lyrics_markers.txt files
    if (recMarkers.length > 0) {
      try {
        const markersText = recMarkers.map(m => Number(m).toFixed(2)).join('\n') + '\n';
        const markersBlob = new Blob([markersText], { type: 'text/plain; charset=utf-8' });
        await uploadBytes(ref(storage, markersUrl), markersBlob, { contentType: 'text/plain; charset=utf-8' });

        if (Array.isArray(rec.lyricsMapping) && rec.lyricsMapping.length > 0) {
          const mappingUrl = rec.lyricsMappingUrl || markersUrl.replace('_markers.txt', '_lyrics_markers.txt');
          const mappingBlob = new Blob([rec.lyricsMapping.join('\n') + '\n'], { type: 'text/plain; charset=utf-8' });
          await uploadBytes(ref(storage, mappingUrl), mappingBlob, { contentType: 'text/plain; charset=utf-8' });
        }
      } catch (uploadErr) {
        console.warn(`Could not sync storage marker file for ${rec.id}:`, uploadErr);
      }
    }

    recordingsByHymn.get(hymnId)!.push({
      id: rec.id,
      hymnId: rec.hymnId,
      cantorId: rec.cantorId,
      mode: recMode,
      audioUrl: rec.audioUrl,
      audioLength: rec.audioLength || 0,
      active: rec.active !== false,
      markersUrl,
      markers: recMarkers,
      lyricsMapping: rec.lyricsMapping || [],
      cantor: {
        id: cantorInfo.id,
        name: cantorInfo.name,
        rank: cantorInfo.rank ?? 99,
        active: cantorInfo.active !== false,
        cantorCloudActive: cantorInfo.cantorCloudActive !== false,
      },
    });
  }

  onProgress?.('Fetching hymns library & lyrics...');
  const hymnsSnap = await getDocs(collection(firestore, 'hymns'));
  const hymns = hymnsSnap.docs.map(d => {
    const data = d.data() as any;
    const hymnRecordings = recordingsByHymn.get(d.id) || [];
    const fallbackHymn = fallbackHymnsMap.get(d.id);
    return {
      id: d.id,
      name: data.name,
      description: data.description || fallbackHymn?.description || '',
      genreId: data.genreIds || data.genreId || fallbackHymn?.genreId || [],
      subGenreId: data.subGenreId || fallbackHymn?.subGenreId || {},
      lyricsCoptic: data.lyricsCoptic || data.lyricsCopticUrl || fallbackHymn?.lyricsCoptic || '',
      lyricsEnglish: data.lyricsEnglish || data.lyricsEnglishUrl || fallbackHymn?.lyricsEnglish || '',
      lyricsArabic: data.lyricsArabic || data.lyricsArabicUrl || fallbackHymn?.lyricsArabic || '',
      lyrics: data.lyrics || {
        coptic: '',
        english: '',
        arabic: '',
      },
      recordings: hymnRecordings,
    };
  });
  hymns.sort((a, b) => a.name.localeCompare(b.name));

  const generatedAt = new Date().toISOString();
  const catalogPayload = {
    generatedAt,
    genres,
    cantors,
    hymns,
  };

  const jsonString = JSON.stringify(catalogPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const fileSizeKb = Math.round((blob.size / 1024) * 10) / 10;

  onProgress?.(`Uploading snapshot (${fileSizeKb} KB) to Firebase Storage CDN...`);
  const catalogRef = ref(storage, 'data/catalog.json');
  await uploadBytes(catalogRef, blob, {
    contentType: 'application/json; charset=utf-8',
    cacheControl: 'public, max-age=60', // 1 minute edge cache
  });

  const downloadUrl = await getDownloadURL(catalogRef);

  // Sync with local filesystem if possible
  try {
    onProgress?.('Synchronizing local development copy...');
    await fetch('/api/admin/save-local-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    });
  } catch (err) {
    // Non-critical in production
    console.warn('Could not sync local file copy:', err);
  }

  onProgress?.('Publication complete!');

  return {
    success: true,
    generatedAt,
    downloadUrl,
    counts: {
      cantors: cantors.length,
      genres: genres.length,
      hymns: hymns.length,
      recordings: recordings.length,
    },
    fileSizeKb,
  };
}
