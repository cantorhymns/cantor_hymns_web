import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n🎵 Publishing verified markers for all 18 Roumi & Mo'aqab hymns (Cantor Tharwat)...`);

  const markersJsonPath = path.resolve(process.cwd(), 'staging/all_roumi_moaqab_markers.json');
  if (!fs.existsSync(markersJsonPath)) {
    throw new Error(`File not found: ${markersJsonPath}`);
  }

  const markersData: Record<string, number[]> = JSON.parse(fs.readFileSync(markersJsonPath, 'utf-8'));
  const cantorId = 'cantor-tharwat';

  // 1. Prepare local staging marker files
  const markersDir = path.resolve(process.cwd(), `staging/markers/${cantorId}`);
  if (!fs.existsSync(markersDir)) {
    fs.mkdirSync(markersDir, { recursive: true });
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log('Authenticating anonymously to Firebase Storage...');
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

  for (const [hymnId, markers] of Object.entries(markersData)) {
    const recordingId = `${cantorId}_${hymnId}`;
    const numVerses = markers.length + 1;
    const lyricsMapping = Array.from({ length: numVerses }, (_, i) => i);

    const markersContent = markers.map(m => m.toFixed(2)).join('\n');
    const lyricsMarkersContent = lyricsMapping.join('\n');

    const localMarkersFile = path.join(markersDir, `${recordingId}_markers.txt`);
    const localLyricsMarkersFile = path.join(markersDir, `${recordingId}_lyrics_markers.txt`);

    fs.writeFileSync(localMarkersFile, markersContent, 'utf-8');
    fs.writeFileSync(localLyricsMarkersFile, lyricsMarkersContent, 'utf-8');

    // Upload to Firebase Storage
    const storageMarkersPath = `markers/${cantorId}/${recordingId}_markers.txt`;
    const storageLyricsMarkersPath = `markers/${cantorId}/${recordingId}_lyrics_markers.txt`;

    await uploadBytes(ref(storage, storageMarkersPath), Buffer.from(markersContent, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
    });

    await uploadBytes(ref(storage, storageLyricsMarkersPath), Buffer.from(lyricsMarkersContent, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
    });

    // Update recordings array in memory
    const recIdx = recordings.findIndex(r => r.id === recordingId);
    if (recIdx >= 0) {
      recordings[recIdx].markers = markers;
      recordings[recIdx].lyricsMapping = lyricsMapping;
      recordings[recIdx].mode = 'learn';
      recordings[recIdx].markersUrl = storageMarkersPath;
      recordings[recIdx].lyricsMappingUrl = storageLyricsMarkersPath;
      console.log(`✅ Uploaded & updated ${recordingId} (${markers.length} markers for ${numVerses} verses)`);
    } else {
      console.warn(`⚠️ Recording ${recordingId} not found in recordings.json!`);
    }
  }

  // 4. Rebuild unified catalog.json
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

  // 5. Write to all target locations (Web & Mobile)
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
      console.log(`✅ Synced catalog files to: ${dir}`);
    }
  }

  // 6. Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 ALL 18 ROUMI & MO\'AQAB HYMNS NOW HAVE FULL VERSE MARKERS & LEARN MODE ENABLED!');
}

main().catch(err => {
  console.error('Fatal error adding markers:', err);
  process.exit(1);
});
