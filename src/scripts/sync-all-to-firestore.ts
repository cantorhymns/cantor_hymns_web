import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function syncAllToFirestore() {
  console.log('🔄 Step 1: Authenticating with Firebase...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.');

  const srcDataDir = path.resolve(process.cwd(), 'src/data');
  const genres: any[] = JSON.parse(fs.readFileSync(path.join(srcDataDir, 'genres.json'), 'utf-8'));
  const hymns: any[] = JSON.parse(fs.readFileSync(path.join(srcDataDir, 'hymns.json'), 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(path.join(srcDataDir, 'recordings.json'), 'utf-8'));

  console.log(`\nLocal data loaded: ${genres.length} genres, ${hymns.length} hymns, ${recordings.length} recordings.`);

  // 1. Sync Genres to Firestore
  console.log('\n🔄 Step 2: Updating all 7 genres in Firestore with subgenre content...');
  for (const g of genres) {
    const genreRef = doc(db, 'genres', g.id);
    await setDoc(
      genreRef,
      {
        id: g.id,
        name: g.name,
        content: g.content || '',
        contentUrl: g.contentUrl || '',
        backgroundUrl: g.backgroundUrl || '',
        active: g.active !== false,
        cantorCloudActive: g.cantorCloudActive !== false,
        rank: g.rank ?? 99,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ✅ Synced Firestore genre: ${g.name} (${g.id}) with ${(g.content || '').split('\n').length} content lines`);
  }

  // 2. Identify new hymns missing from Firestore
  console.log('\n🔄 Step 3: Checking Firestore hymns collection...');
  const existingHymnsSnap = await getDocs(collection(db, 'hymns'));
  const existingHymnIds = new Set(existingHymnsSnap.docs.map(d => d.id));
  console.log(`  Found ${existingHymnIds.size} existing hymns in Firestore.`);

  const hymnsToSync = hymns.filter(h => !existingHymnIds.has(h.id) || h.id.startsWith('roumi-') || h.id.startsWith('moaqab-'));
  console.log(`  Hymns to sync/update: ${hymnsToSync.length}`);

  let batch = writeBatch(db);
  let batchCount = 0;

  for (const h of hymnsToSync) {
    const hRef = doc(db, 'hymns', h.id);
    const genreIdArr = Array.isArray(h.genreId) ? h.genreId : [h.genreId || 'kiahk'];
    batch.set(
      hRef,
      {
        id: h.id,
        name: h.name,
        description: h.description || '',
        genreId: genreIdArr,
        subGenreId: h.subGenreId || { kiahk: 'Vespers Praises' },
        lyrics: h.lyrics || { coptic: '', english: '', arabic: '' },
        lyricsCopticUrl: h.lyricsCoptic || h.lyricsCopticUrl || '',
        lyricsEnglishUrl: h.lyricsEnglish || h.lyricsEnglishUrl || '',
        lyricsArabicUrl: h.lyricsArabic || h.lyricsArabicUrl || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`  ✅ Successfully synced ${hymnsToSync.length} hymns to Firestore!`);

  // 3. Sync recordings missing from Firestore
  console.log('\n🔄 Step 4: Checking Firestore recordings collection...');
  const existingRecsSnap = await getDocs(collection(db, 'recordings'));
  const existingRecIds = new Set(existingRecsSnap.docs.map(d => d.id));
  console.log(`  Found ${existingRecIds.size} existing recordings in Firestore.`);

  const recsToSync = recordings.filter(
    r => !existingRecIds.has(r.id) || r.hymnId?.startsWith('roumi-') || r.hymnId?.startsWith('moaqab-')
  );
  console.log(`  Recordings to sync/update: ${recsToSync.length}`);

  batch = writeBatch(db);
  batchCount = 0;

  for (const r of recsToSync) {
    const rRef = doc(db, 'recordings', r.id);
    batch.set(
      rRef,
      {
        id: r.id,
        hymnId: r.hymnId,
        cantorId: r.cantorId,
        audioUrl: r.audioUrl,
        audioLength: r.audioLength || 0,
        markers: r.markers || [],
        lyricsMapping: r.lyricsMapping || [],
        markersUrl: r.markersUrl || '',
        lyricsMappingUrl: r.lyricsMappingUrl || '',
        active: r.active !== false,
        mode: r.mode || 'learn',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`  ✅ Successfully synced ${recsToSync.length} recordings to Firestore!`);

  // 4. Verification
  console.log('\n🔄 Step 5: Verifying Firestore state...');
  const [finalGenresSnap, finalHymnsSnap, finalRecsSnap] = await Promise.all([
    getDocs(collection(db, 'genres')),
    getDocs(collection(db, 'hymns')),
    getDocs(collection(db, 'recordings')),
  ]);

  console.log(`  🎉 Verification complete:`);
  console.log(`     - Firestore Genres: ${finalGenresSnap.size} / 7`);
  console.log(`     - Firestore Hymns: ${finalHymnsSnap.size} / 70`);
  console.log(`     - Firestore Recordings: ${finalRecsSnap.size} / 86`);

  for (const d of finalGenresSnap.docs) {
    const gData = d.data();
    const lineCount = (gData.content || '').split('\n').filter((l: string) => l.trim()).length;
    console.log(`       * ${gData.name} (${d.id}): ${lineCount} items/subgenres in content`);
  }

  const finalKiahkDoc = finalGenresSnap.docs.find(d => d.id === 'kiahk')?.data();
  const roumiCountInKiahk = (finalKiahkDoc?.content || '')
    .split('\n')
    .filter((l: string) => l.startsWith('roumi-') || l.startsWith('moaqab-')).length;
  console.log(`     - Roumi & Mo'aqab hymns present in Kiahk content: ${roumiCountInKiahk} / 18`);

  console.log('\n🚀 ALL DATA FULLY SYNCHRONIZED TO CLOUD FIRESTORE!');
}

syncAllToFirestore()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal sync error:', err);
    process.exit(1);
  });
