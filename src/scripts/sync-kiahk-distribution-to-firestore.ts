import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { compileAndPublishCatalog } from '../lib/publish-catalog';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔄 Initializing Firebase & authenticating...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.\n');

  const hymnsPath = path.resolve(process.cwd(), 'src/data/hymns.json');
  const genresPath = path.resolve(process.cwd(), 'src/data/genres.json');
  const cantorsPath = path.resolve(process.cwd(), 'src/data/cantors.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const genres: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));

  const targetHymnIds = [
    'je-efesmaroout-kiahk-weekdays',
    'ti-parthenos-kiahk-weekdays',
    'je-efesmaroout-kiahk-weekends',
    'ef-emepsha-ghar-kiahk-weekends',
  ];

  console.log('1️⃣ Writing 4 Kiahk Distribution hymns to Cloud Firestore collection "hymns"...');
  for (const hid of targetHymnIds) {
    const hymn = hymns.find(h => h.id === hid);
    if (!hymn) {
      console.warn(`⚠️ Hymn ${hid} not found in hymns.json!`);
      continue;
    }

    const hymnRef = doc(db, 'hymns', hid);
    await setDoc(
      hymnRef,
      {
        id: hymn.id,
        name: hymn.name,
        genreId: hymn.genreId || ['kiahk'],
        subGenreId: hymn.subGenreId || { kiahk: 'Liturgy' },
        lyrics: hymn.lyrics || { coptic: '', english: '', arabic: '' },
        lyricsCopticUrl: hymn.lyricsCoptic || `lyrics/coptic/${hid}_coptic.md`,
        lyricsEnglishUrl: hymn.lyricsEnglish || `lyrics/english/${hid}_english.md`,
        lyricsArabicUrl: hymn.lyricsArabic || `lyrics/arabic/${hid}_arabic.md`,
        description: hymn.description || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ✅ Synced hymn "${hymn.name}" (${hid}) to Firestore`);
  }

  console.log('\n2️⃣ Updating Kiahk genre in Cloud Firestore collection "genres"...');
  const kiahkGenre = genres.find(g => g.id === 'kiahk');
  if (kiahkGenre) {
    const kiahkRef = doc(db, 'genres', 'kiahk');
    await setDoc(
      kiahkRef,
      {
        id: 'kiahk',
        name: kiahkGenre.name,
        content: kiahkGenre.content,
        contentUrl: kiahkGenre.contentUrl || 'genres/content/kiahk_content.txt',
        rank: kiahkGenre.rank ?? 1,
        active: kiahkGenre.active !== false,
        cantorCloudActive: true,
        backgroundUrl: kiahkGenre.backgroundUrl || 'genres/backgrounds/Kiahk1.jpeg',
        icon: kiahkGenre.icon || 'Cross',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('  ✅ Updated Kiahk genre content with Distribution subgenre in Firestore');
  }

  console.log('\n3️⃣ Activating Cantor Zaher in Cloud Firestore collection "cantors"...');
  const zaher = cantors.find(c => c.id === 'cantor-zaher');
  if (zaher) {
    const zaherRef = doc(db, 'cantors', 'cantor-zaher');
    await setDoc(
      zaherRef,
      {
        id: 'cantor-zaher',
        name: zaher.name || 'Cantor Zaher',
        rank: zaher.rank ?? 5,
        active: zaher.active !== false,
        cantorCloudActive: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('  ✅ Activated Cantor Zaher (cantorCloudActive: true) in Firestore');
  }

  console.log('\n4️⃣ Compiling and Publishing Live Catalog from Cloud Firestore to Firebase Storage CDN...');
  const result = await compileAndPublishCatalog(db, storage, status => console.log(`  ⏳ ${status}`));
  console.log(`  ✅ Published catalog to CDN successfully! (${result.counts.hymns} hymns, ${result.fileSizeKb} KB)`);

  console.log('\n🎉 ALL 4 KIAHK DISTRIBUTION HYMNS, GENRE HIERARCHY, AND CANTOR ZAHER ARE FULLY SYNCED TO FIRESTORE AND PUBLISHED TO CDN!');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
