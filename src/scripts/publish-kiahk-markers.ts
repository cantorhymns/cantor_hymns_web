import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n🎵 Updating & Publishing verse markers for Ef-Emepsha Ghar (Weekends)...`);

  const zaherMarkers = [118.00, 235.15, 355.15, 462.60, 575.35, 664.00, 797.40, 840.60];
  const zaherLyrics = Array.from({ length: 9 }, (_, i) => i);

  // Ef-Emepsha Ghar: 35 markers for 36 verses
  // Every fast verse (V5-V29) starts at Line 1 ("Shere ne o ti parthenos") with ~150-200ms pre-roll breath margin
  const ibrahimMarkers = [
    62.25,   // V2: Pef-ran holj
    117.90,  // V3: Owoh enten-ti-o-ou
    173.30,  // V4: Owoh enten-osh evol
    221.10,  // V5: Shere ne... epsot en-Adam nem Eva
    247.35,  // V6: Shere ne... ef-rashi en-Abel
    273.20,  // V7: Shere ne... ti-kivotos ente Noe
    299.15,  // V8: Shere ne... pi-ehmot en-Avraam
    322.90,  // V9: Shere ne... epsoti en-Isaak
    348.70,  // V10: Shere ne... ep-thelel em-peniot Yakob
    377.50,  // V11: Shere ne... ep-shoushou en-Iouda
    402.60,  // V12: Shere ne... ti-theoria ente Moysis
    428.30,  // V13: Shere ne... etjom en-Iisou nem Gedeon
    453.45,  // V14: Shere ne... ethmet-jori en-Samouel
    476.40,  // V15: Shere ne... ti-hypomoni ente Yob
    500.20,  // V16: Shere ne... etsheri en-David pi-ouro
    524.50,  // V17: Shere ne... tishferi en-Solomon
    549.40,  // V18: Shere ne... ti-profitia en-Isaias
    575.05,  // V19: Shere ne... ep-harma en-Ezekiel
    599.10,  // V20: Shere ne... ep-chisi en-Elias
    626.85,  // V21: Shere ne... pi-ehmot en-Eliseos
    650.55,  // V22: Shere ne... ef-rashi en-ni-angelos
    675.70,  // V23: Shere ne... ep-taio en-ni-patriarkhis
    704.20,  // V24: Shere ne... ef-las en-ni-apostolos
    729.25,  // V25: Shere ne... pi-khlom en-ni-martyros
    756.15,  // V26: Shere ne... ep-tajro en-ni-ekklisia
    781.25,  // V27: Shere ne... ti-moumi en-onkh
    806.45,  // V28: Shere ne... pi-sperma ente p-Israel
    831.35,  // V29: Shere ne... et-hefso en-ni-stavroforos
    853.57,  // V30: Ten-tiho ari-pen-mevi
    880.90,  // V31: Ethref-tajron khen pi-nahti
    910.05,  // V32: Entef-areh e-pen-manes-o-ou
    944.05,  // V33: Entef-shop erof en-nen-evki
    965.17,  // V34: Entef-ti nan en-ou-parisia
    983.02,  // V35: Ten-ti-o-ou ne
    1037.40, // V36: Ari-presvevin e-ehri ejon
  ];
  const ibrahimLyrics = Array.from({ length: 36 }, (_, i) => i);

  const updates = [
    {
      recordingId: 'cantor-zaher_ti-parthenos-kiahk-weekdays',
      cantorId: 'cantor-zaher',
      hymnId: 'ti-parthenos-kiahk-weekdays',
      markers: zaherMarkers,
      lyricsMapping: zaherLyrics,
    },
    {
      recordingId: 'cantor-ibrahim_ef-emepsha-ghar-kiahk-weekends',
      cantorId: 'cantor-ibrahim',
      hymnId: 'ef-emepsha-ghar-kiahk-weekends',
      markers: ibrahimMarkers,
      lyricsMapping: ibrahimLyrics,
    },
  ];

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const db = getFirestore(app);

  console.log('Authenticating anonymously to Firebase Storage & Firestore...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.\n');

  // Load existing data files
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  for (const item of updates) {
    const { recordingId, cantorId, markers, lyricsMapping } = item;
    const markersDir = path.resolve(process.cwd(), `staging/markers/${cantorId}`);
    if (!fs.existsSync(markersDir)) {
      fs.mkdirSync(markersDir, { recursive: true });
    }

    const markersContent = markers.map(m => m.toFixed(2)).join('\n');
    const lyricsMarkersContent = lyricsMapping.join('\n');

    const localMarkersFile = path.join(markersDir, `${recordingId}_markers.txt`);
    const localLyricsMarkersFile = path.join(markersDir, `${recordingId}_lyrics_markers.txt`);

    fs.writeFileSync(localMarkersFile, markersContent, 'utf-8');
    fs.writeFileSync(localLyricsMarkersFile, lyricsMarkersContent, 'utf-8');

    // Upload to Firebase Storage
    const storageMarkersPath = `markers/${cantorId}/${recordingId}_markers.txt`;
    const storageLyricsMarkersPath = `markers/${cantorId}/${recordingId}_lyrics_markers.txt`;

    console.log(`☁️ Uploading marker files for ${recordingId} to Storage...`);
    await uploadBytes(ref(storage, storageMarkersPath), Buffer.from(markersContent, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
    });

    await uploadBytes(ref(storage, storageLyricsMarkersPath), Buffer.from(lyricsMarkersContent, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
    });

    // Update in-memory recordings
    const recIdx = recordings.findIndex(r => r.id === recordingId);
    if (recIdx >= 0) {
      recordings[recIdx].markers = markers;
      recordings[recIdx].lyricsMapping = lyricsMapping;
      recordings[recIdx].mode = 'learn';
      recordings[recIdx].markersUrl = storageMarkersPath;
      recordings[recIdx].lyricsMappingUrl = storageLyricsMarkersPath;

      // Primary source of truth write to Cloud Firestore
      const recDocRef = doc(db, 'recordings', recordingId);
      await setDoc(
        recDocRef,
        {
          markers,
          lyricsMapping,
          mode: 'learn',
          markersUrl: storageMarkersPath,
          lyricsMappingUrl: storageLyricsMarkersPath,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`✅ ${recordingId}: Updated in Firestore and Storage (${markers.length} markers for ${lyricsMapping.length} verses)`);
    } else {
      console.warn(`⚠️ Recording ${recordingId} not found in recordings.json!`);
    }
  }

  // Rebuild catalog.json
  console.log('\n📦 Rebuilding unified catalog.json...');
  const cantorsMap = new Map(cantors.map(c => [c.id, c]));
  const catalog = {
    generatedAt: new Date().toISOString(),
    genres: genresList.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    cantors: cantors.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    hymns: hymns.map(h => {
      const hymnRecordings = recordings
        .filter(r => r.hymnId === h.id && r.active !== false)
        .map(r => ({
          ...r,
          cantor: cantorsMap.get(r.cantorId) || undefined,
        }));

      return {
        ...h,
        recordings: hymnRecordings,
      };
    }).sort((a, b) => a.name.localeCompare(b.name)),
  };

  // Sync to all 4 target directories
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced files to: ${dir}`);
    }
  }

  // Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 EF-EMEPSHA GHAR VERSE MARKERS SUCCESSFULLY RE-ALIGNED TO STANZA 1 & LIVE!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error updating markers:', err);
  process.exit(1);
});
