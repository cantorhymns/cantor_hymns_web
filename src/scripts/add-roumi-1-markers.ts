import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n🎵 Adding pedagogical markers to Roumi 1 (Cantor Tharwat)...`);

  const hymnId = 'roumi-1';
  const cantorId = 'cantor-tharwat';
  const recordingId = `${cantorId}_${hymnId}`;

  // 6 markers for 7 verses (each marker starts Verse 2, 3, 4, 5, 6, 7)
  // Verse 2: 25.48s (Verse 1 "adikhostasia" ended at 24.98s, pause 25.00-25.51s, "Aspile" onset at 25.53s)
  // Verse 7: 144.40s (Verse 6 "thee-ethowab" ended at 144.24s, pause 144.25-144.46s, "Ten-ti-o-ou" onset at 144.48s)
  const markers = [25.48, 50.25, 74.75, 98.70, 122.02, 144.40];
  const lyricsMapping = [0, 1, 2, 3, 4, 5, 6];

  // 1. Prepare local staging marker files
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
  console.log(`✅ Generated local marker files in ${markersDir}`);

  // 2. Upload marker files to Firebase Storage
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const db = getFirestore(app);

  console.log('Authenticating anonymously to Firebase Storage...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.');

  const storageMarkersPath = `markers/${cantorId}/${recordingId}_markers.txt`;
  const storageLyricsMarkersPath = `markers/${cantorId}/${recordingId}_lyrics_markers.txt`;

  console.log(`Uploading ${storageMarkersPath}...`);
  await uploadBytes(ref(storage, storageMarkersPath), Buffer.from(markersContent, 'utf-8'), {
    contentType: 'text/plain; charset=utf-8',
  });

  console.log(`Uploading ${storageLyricsMarkersPath}...`);
  await uploadBytes(ref(storage, storageLyricsMarkersPath), Buffer.from(lyricsMarkersContent, 'utf-8'), {
    contentType: 'text/plain; charset=utf-8',
  });
  console.log('✅ Uploaded marker files to Firebase Storage.');

  // 3. Update recordings.json
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  const recIdx = recordings.findIndex(r => r.id === recordingId);
  if (recIdx >= 0) {
    recordings[recIdx].markers = markers;
    recordings[recIdx].lyricsMapping = lyricsMapping;
    recordings[recIdx].mode = 'learn';
    recordings[recIdx].markersUrl = storageMarkersPath;
    recordings[recIdx].lyricsMappingUrl = storageLyricsMarkersPath;

    // Sync to Cloud Firestore
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

    console.log(`✅ Updated recording ${recordingId} in JSON & Cloud Firestore with ${markers.length} markers.`);
  } else {
    throw new Error(`Recording ${recordingId} not found in recordings.json!`);
  }

  // 4. Rebuild unified catalog.json
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

  // 5. Write to all target locations (Web & Mobile)
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced catalog files to: ${dir}`);
    }
  }

  // 6. Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 ALL MARKERS FOR ROUMI 1 SUCCESSFULLY SAVED & PUBLISHED!');
}

main().catch(err => {
  console.error('Fatal error adding markers:', err);
  process.exit(1);
});
