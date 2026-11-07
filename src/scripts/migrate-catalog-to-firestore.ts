import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  writeBatch,
  doc,
  collection,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// In-memory cache for storage downloads during migration
const textCache = new Map<string, string>();

async function fetchStorageText(storagePath?: string): Promise<string | null> {
  if (!storagePath) return null;
  if (textCache.has(storagePath)) return textCache.get(storagePath)!;

  try {
    const sRef = storageRef(storage, storagePath);
    const url = await getDownloadURL(sRef);
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    textCache.set(storagePath, text);
    return text;
  } catch (err) {
    return null;
  }
}

async function fetchMarkersArray(markersUrl?: string): Promise<number[]> {
  if (!markersUrl) return [];
  const content = await fetchStorageText(markersUrl);
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map(l => parseFloat(l.trim()))
    .filter(val => !isNaN(val) && val >= 0)
    .sort((a, b) => a - b);
}

async function fetchLyricsMappingArray(
  markersUrl?: string,
  customLyricsMappingUrl?: string
): Promise<number[]> {
  const targetPath =
    customLyricsMappingUrl ||
    (markersUrl ? markersUrl.replace('_markers.txt', '_lyrics_markers.txt') : undefined);
  if (!targetPath) return [];

  const content = await fetchStorageText(targetPath);
  if (!content) return [];
  return content.split(/\r?\n/).map(l => {
    const parsed = parseInt(l.trim(), 10);
    return isNaN(parsed) ? -1 : parsed;
  });
}

export async function runMigration() {
  console.log('🚀 Starting CantorHymns Firestore Migration...');

  // Authenticate
  await signInAnonymously(auth);
  console.log('✅ Authenticated.');

  // Read local catalog.json
  const catalogPath = path.resolve(process.cwd(), 'src/data/catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const { genres = [], cantors = [], hymns = [] } = catalog;
  console.log(
    `Found in catalog: ${genres.length} genres, ${cantors.length} cantors, ${hymns.length} hymns.`
  );

  // 1. Migrate Cantors
  console.log('\n--- 1. Migrating Cantors ---');
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const c of cantors) {
    const cRef = doc(db, 'cantors', c.id);
    batch.set(
      cRef,
      {
        id: c.id,
        name: c.name,
        rank: c.rank ?? 99,
        cantorCloudActive: c.cantorCloudActive !== false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchCount++;
  }
  await batch.commit();
  console.log(`✅ Migrated ${cantors.length} cantors.`);

  // 2. Migrate Genres
  console.log('\n--- 2. Migrating Genres ---');
  batch = writeBatch(db);
  batchCount = 0;

  for (const g of genres) {
    const gRef = doc(db, 'genres', g.id);
    batch.set(
      gRef,
      {
        id: g.id,
        name: g.name,
        rank: g.rank ?? 99,
        description: g.description || '',
        icon: g.icon || 'Cross',
        backgroundUrl: g.backgroundUrl || '',
        contentUrl: g.contentUrl || '',
        active: g.active !== false,
        cantorCloudActive: g.cantorCloudActive !== false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchCount++;
  }
  await batch.commit();
  console.log(`✅ Migrated ${genres.length} genres.`);

  // 3. Migrate Hymns & Recordings
  console.log('\n--- 3. Migrating Hymns & Recordings ---');

  let totalRecordings = 0;
  let hymnIndex = 0;

  for (const h of hymns) {
    hymnIndex++;
    process.stdout.write(
      `\rProcessing hymn [${hymnIndex}/${hymns.length}]: ${h.name.slice(0, 30)}...`
    );

    // Fetch lyrics text concurrently
    const [englishText, copticText, arabicText] = await Promise.all([
      fetchStorageText(h.lyricsEnglish),
      fetchStorageText(h.lyricsCoptic),
      fetchStorageText(h.lyricsArabic),
    ]);

    const hymnDocData: Record<string, any> = {
      id: h.id,
      name: h.name,
      genreId: h.genreId || [],
      description: h.description || '',
      lyricsEnglishUrl: h.lyricsEnglish || '',
      lyricsCopticUrl: h.lyricsCoptic || '',
      lyricsArabicUrl: h.lyricsArabic || '',
      lyrics: {
        english: englishText || '',
        coptic: copticText || '',
        arabic: arabicText || '',
      },
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'hymns', h.id), hymnDocData, { merge: true });

    // Process recordings for this hymn
    const recs = h.recordings || [];
    for (const r of recs) {
      totalRecordings++;
      const [markers, lyricsMapping] = await Promise.all([
        fetchMarkersArray(r.markersUrl),
        fetchLyricsMappingArray(r.markersUrl, r.lyricsMappingUrl),
      ]);

      const recDocData: Record<string, any> = {
        id: r.id,
        hymnId: h.id,
        cantorId: r.cantorId,
        audioUrl: r.audioUrl,
        markersUrl: r.markersUrl || '',
        lyricsMappingUrl: r.lyricsMappingUrl || '',
        active: r.active !== false,
        mode: r.mode || 'learn',
        audioLength: r.audioLength || 0,
        markers,
        lyricsMapping,
        markersCount: markers.length,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'recordings', r.id), recDocData, { merge: true });
    }
  }

  console.log(`\n✅ Migrated ${hymns.length} hymns and ${totalRecordings} recordings.`);

  // 4. Setup Initial Authorized Users
  console.log('\n--- 4. Setting Up Authorized Users ---');
  const adminEmail = 'cantorhymns@gmail.com';
  await setDoc(
    doc(db, 'authorized_users', adminEmail),
    {
      email: adminEmail,
      role: 'admin',
      name: 'Owner Admin',
      addedAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✅ Registered "${adminEmail}" as Super Admin.`);

  console.log('\n🎉 ALL DATA MIGRATED TO FIRESTORE SUCCESSFULLY!');
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
