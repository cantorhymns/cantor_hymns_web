import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';

export interface UpdateMarkersOptions {
  recordingId?: string;
  cantorId?: string;
  hymnId?: string;
  markers?: number[];
  markersFilePath?: string;
  lyricsMapping?: number[];
  lyricsMappingFilePath?: string;
}

export async function updateMarkers(options: UpdateMarkersOptions) {
  const { markersFilePath, lyricsMappingFilePath } = options;
  let { recordingId, cantorId, hymnId, markers: inputMarkers, lyricsMapping: inputLyricsMapping } = options;

  if (!recordingId) {
    if (cantorId && hymnId) {
      recordingId = `${cantorId}_${hymnId}`;
    } else {
      throw new Error('Must provide either recordingId or both cantorId and hymnId');
    }
  }

  console.log(`\n⏱️ Updating markers for recording: "${recordingId}"...`);

  // 1. Read files if paths are provided
  if (!inputMarkers && markersFilePath && fs.existsSync(markersFilePath)) {
    const raw = fs.readFileSync(markersFilePath, 'utf-8').split(/\r?\n/);
    inputMarkers = raw
      .map(l => parseFloat(l.trim()))
      .filter(n => !isNaN(n) && n >= 0)
      .sort((a, b) => a - b);
  }

  if (!inputLyricsMapping && lyricsMappingFilePath && fs.existsSync(lyricsMappingFilePath)) {
    const raw = fs.readFileSync(lyricsMappingFilePath, 'utf-8').split(/\r?\n/);
    inputLyricsMapping = raw
      .map(l => parseInt(l.trim(), 10))
      .filter(n => !isNaN(n));
  }

  // 2. Read local data files
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genres: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  const recIdx = recordings.findIndex(r => r.id === recordingId);
  if (recIdx === -1) {
    throw new Error(`Recording with ID "${recordingId}" not found in recordings.json`);
  }

  const existingRec = recordings[recIdx];
  const updatedMarkers = inputMarkers !== undefined ? inputMarkers : existingRec.markers;
  const updatedLyricsMapping = inputLyricsMapping !== undefined ? inputLyricsMapping : existingRec.lyricsMapping;

  recordings[recIdx].markers = updatedMarkers;
  recordings[recIdx].lyricsMapping = updatedLyricsMapping;

  // 3. Update Cloud Firestore
  console.log('🔄 Syncing updated markers to Cloud Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  await signInAnonymously(auth);
  const recDocRef = doc(db, 'recordings', recordingId);
  await setDoc(
    recDocRef,
    {
      markers: updatedMarkers,
      lyricsMapping: updatedLyricsMapping,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`  ✅ Cloud Firestore recording "${recordingId}" updated with ${updatedMarkers.length} markers.`);

  // 4. Rebuild catalog snapshot
  console.log('🔄 Rebuilding catalog snapshot...');
  const cantorsMap = new Map(cantors.map(c => [c.id, c]));
  const sortedGenres = [...genres].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
  const sortedCantors = [...cantors].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));

  const compiledHymns = hymns.map(h => {
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
  }).sort((a, b) => a.name.localeCompare(b.name));

  const catalog = {
    generatedAt: new Date().toISOString(),
    genres: sortedGenres,
    cantors: sortedCantors,
    hymns: compiledHymns,
  };

  // 5. Sync to all target directories
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  const recsJson = JSON.stringify(recordings, null, 2);
  const catalogJson = JSON.stringify(catalog, null, 2);

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'recordings.json'), recsJson, 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), catalogJson, 'utf-8');
      console.log(`  ✅ Synced: ${dir}`);
    }
  }

  // 6. Push to Firebase Storage CDN
  console.log('☁️ Uploading updated catalog to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log(`🎉 Markers for "${recordingId}" successfully updated and deployed!`);
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const recordingId = getArg('--recording-id');
  const cantorId = getArg('--cantor');
  const hymnId = getArg('--hymn-id');
  const markersFilePath = getArg('--markers-file');
  const lyricsMappingFilePath = getArg('--lyrics-mapping-file');

  if (!recordingId && (!cantorId || !hymnId)) {
    console.error('Usage: npx tsx src/scripts/update-markers.ts (--recording-id <id> | --cantor <cantor> --hymn-id <hymn>) [--markers-file <path>] [--lyrics-mapping-file <path>]');
    process.exit(1);
  }

  updateMarkers({
    recordingId,
    cantorId,
    hymnId,
    markersFilePath,
    lyricsMappingFilePath,
  }).catch(err => {
    console.error('Update markers failed:', err);
    process.exit(1);
  });
}
