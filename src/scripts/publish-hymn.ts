import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';

export interface PublishOptions {
  hymnId: string;
  name: string;
  genres: string[];
  subgenre?: string;
  subGenreId?: Record<string, string>;
  description?: string;
  cantorId?: string;
  mode?: 'learn' | 'listen';
  audioLength?: number;
  markers?: number[];
  markersFilePath?: string;
  lyricsMapping?: number[];
  lyricsMappingFilePath?: string;
  copticLyricsFilePath?: string;
  englishLyricsFilePath?: string;
  arabicLyricsFilePath?: string;
  inlineLyrics?: { coptic?: string; english?: string; arabic?: string };
  audioFilePath?: string;
  filesToUpload?: { localPath: string; storagePath: string; contentType?: string }[];
}

export async function publishHymnToCatalog(options: PublishOptions) {
  const {
    hymnId,
    name,
    genres,
    subgenre,
    subGenreId,
    description,
    cantorId,
    mode = 'learn',
    audioLength,
    markers: inputMarkers,
    markersFilePath,
    lyricsMapping: inputLyricsMapping,
    lyricsMappingFilePath,
    copticLyricsFilePath,
    englishLyricsFilePath,
    arabicLyricsFilePath,
    inlineLyrics,
    audioFilePath,
    filesToUpload = [],
  } = options;

  console.log(`\n📦 Processing hymn: "${name}" (${hymnId})...`);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const auth = getAuth(app);

  try {
    await signInAnonymously(auth);
    console.log('✅ Authenticated anonymously with Firebase.');
  } catch (err: any) {
    console.warn('⚠️ Anonymous auth note:', err.message);
  }

  // 1. Gather all files that need uploading to Firebase Storage
  const allUploads = [...filesToUpload];

  if (cantorId && audioFilePath && fs.existsSync(audioFilePath)) {
    allUploads.push({
      localPath: audioFilePath,
      storagePath: `tracks/${cantorId}/${cantorId}_${hymnId}.mp3`,
      contentType: 'audio/mpeg',
    });
  }

  if (cantorId && markersFilePath && fs.existsSync(markersFilePath)) {
    allUploads.push({
      localPath: markersFilePath,
      storagePath: `markers/${cantorId}/${cantorId}_${hymnId}_markers.txt`,
      contentType: 'text/plain',
    });
  }

  if (cantorId && lyricsMappingFilePath && fs.existsSync(lyricsMappingFilePath)) {
    allUploads.push({
      localPath: lyricsMappingFilePath,
      storagePath: `markers/${cantorId}/${cantorId}_${hymnId}_lyrics_markers.txt`,
      contentType: 'text/plain',
    });
  }

  // Perform Firebase Storage uploads
  if (allUploads.length > 0) {
    console.log(`\n☁️ Uploading ${allUploads.length} media file(s) to Firebase Storage...`);
    for (const f of allUploads) {
      if (!fs.existsSync(f.localPath)) {
        console.warn(`  ⚠️ Warning: Local file not found: "${f.localPath}", skipping.`);
        continue;
      }
      const fileBuffer = fs.readFileSync(f.localPath);
      const sRef = ref(storage, f.storagePath);
      await uploadBytes(sRef, fileBuffer, {
        contentType: f.contentType || 'text/plain',
      });
      console.log(`  ✅ Uploaded: ${f.storagePath} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
    }
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
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  // 3. Resolve Lyrics
  let copticText = inlineLyrics?.coptic || '';
  let englishText = inlineLyrics?.english || '';
  let arabicText = inlineLyrics?.arabic || '';

  const candidateCoptic = copticLyricsFilePath || path.resolve(process.cwd(), `staging/lyrics/coptic/${hymnId}_coptic.md`);
  if (!copticText && fs.existsSync(candidateCoptic)) {
    copticText = fs.readFileSync(candidateCoptic, 'utf-8').trim();
  }

  const candidateEnglish = englishLyricsFilePath || path.resolve(process.cwd(), `staging/lyrics/english/${hymnId}_english.md`);
  if (!englishText && fs.existsSync(candidateEnglish)) {
    englishText = fs.readFileSync(candidateEnglish, 'utf-8').trim();
  }

  const candidateArabic = arabicLyricsFilePath || path.resolve(process.cwd(), `staging/lyrics/arabic/${hymnId}_arabic.md`);
  if (!arabicText && fs.existsSync(candidateArabic)) {
    arabicText = fs.readFileSync(candidateArabic, 'utf-8').trim();
  }

  // 4. Resolve Markers & Lyrics Mapping
  let parsedMarkers: number[] = inputMarkers || [];
  const candidateMarkersPath = markersFilePath || (cantorId ? path.resolve(process.cwd(), `staging/markers/${cantorId}/${cantorId}_${hymnId}_markers.txt`) : '');
  if (parsedMarkers.length === 0 && candidateMarkersPath && fs.existsSync(candidateMarkersPath)) {
    const rawLines = fs.readFileSync(candidateMarkersPath, 'utf-8').split(/\r?\n/);
    parsedMarkers = rawLines
      .map(l => parseFloat(l.trim()))
      .filter(n => !isNaN(n) && n >= 0)
      .sort((a, b) => a - b);
  }

  let parsedLyricsMapping: number[] = inputLyricsMapping || [];
  const candidateLyricsMappingPath = lyricsMappingFilePath || (cantorId ? path.resolve(process.cwd(), `staging/markers/${cantorId}/${cantorId}_${hymnId}_lyrics_markers.txt`) : '');
  if (parsedLyricsMapping.length === 0 && candidateLyricsMappingPath && fs.existsSync(candidateLyricsMappingPath)) {
    const rawLines = fs.readFileSync(candidateLyricsMappingPath, 'utf-8').split(/\r?\n/);
    parsedLyricsMapping = rawLines
      .map(l => parseInt(l.trim(), 10))
      .filter(n => !isNaN(n));
  }

  // 5. Build and Upsert Hymn Record
  const existingHymnIndex = hymns.findIndex(h => h.id === hymnId);
  const resolvedSubgenreMap: Record<string, string> = { ...(subGenreId || {}) };
  if (subgenre) {
    genres.forEach(g => {
      resolvedSubgenreMap[g] = subgenre;
    });
  }

  const hymnRecord: any = {
    id: hymnId,
    name,
    genreId: genres,
    description: description || (existingHymnIndex >= 0 ? hymns[existingHymnIndex].description : '') || '',
    lyricsEnglish: `lyrics/english/${hymnId}_english.md`,
    lyricsCoptic: `lyrics/coptic/${hymnId}_coptic.md`,
    lyricsArabic: `lyrics/arabic/${hymnId}_arabic.md`,
    lyrics: {
      coptic: copticText || (existingHymnIndex >= 0 ? hymns[existingHymnIndex].lyrics?.coptic : '') || '',
      english: englishText || (existingHymnIndex >= 0 ? hymns[existingHymnIndex].lyrics?.english : '') || '',
      arabic: arabicText || (existingHymnIndex >= 0 ? hymns[existingHymnIndex].lyrics?.arabic : '') || '',
    },
  };

  if (Object.keys(resolvedSubgenreMap).length > 0) {
    hymnRecord.subGenreId = resolvedSubgenreMap;
  }

  if (existingHymnIndex >= 0) {
    hymns[existingHymnIndex] = { ...hymns[existingHymnIndex], ...hymnRecord };
    console.log(`  Updated existing hymn entry: ${hymnId}`);
  } else {
    hymns.push(hymnRecord);
    hymns.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`  Added new hymn entry: ${hymnId}`);
  }

  // 6. Build and Upsert Recording Record (if cantorId provided)
  let recordingRecord: any = null;
  if (cantorId) {
    const recordingId = `${cantorId}_${hymnId}`;
    const existingRecIndex = recordings.findIndex(r => r.id === recordingId);
    const existingRec = existingRecIndex >= 0 ? recordings[existingRecIndex] : null;

    recordingRecord = {
      id: recordingId,
      hymnId,
      cantorId,
      audioUrl: `tracks/${cantorId}/${recordingId}.mp3`,
      markersUrl: `markers/${cantorId}/${recordingId}_markers.txt`,
      lyricsMappingUrl: `markers/${cantorId}/${recordingId}_lyrics_markers.txt`,
      audioLength: audioLength !== undefined ? audioLength : (existingRec?.audioLength || 0),
      markers: parsedMarkers.length > 0 ? parsedMarkers : (existingRec?.markers || []),
      lyricsMapping: parsedLyricsMapping.length > 0 ? parsedLyricsMapping : (existingRec?.lyricsMapping || []),
      active: true,
      mode: mode || existingRec?.mode || 'learn',
    };

    if (existingRecIndex >= 0) {
      recordings[existingRecIndex] = { ...recordings[existingRecIndex], ...recordingRecord };
      console.log(`  Updated recording entry: ${recordingId}`);
    } else {
      recordings.push(recordingRecord);
      console.log(`  Added new recording entry: ${recordingId}`);
    }
  }

  // 7. Update Genre Subgenre Layouts (Zero "Other" Hymns Rule)
  const modifiedGenreIds: string[] = [];
  for (const gid of genres) {
    const targetSubgenre = resolvedSubgenreMap[gid] || subgenre;
    const genreObj = genresList.find(g => g.id === gid);
    if (!genreObj) continue;

    let content = genreObj.content || '';
    const lines = content.split('\n');

    // Check if hymnId is already in content
    const isAlreadyPresent = lines.some((l: string) => l.trim() === hymnId);
    if (!isAlreadyPresent) {
      if (targetSubgenre) {
        const subGenreHeader = `subGenre:${targetSubgenre}`;
        const headerIndex = lines.findIndex((l: string) => l.trim() === subGenreHeader);
        if (headerIndex >= 0) {
          // Find end of this subgenre section (next subGenre: or end of lines)
          let insertIdx = headerIndex + 1;
          while (insertIdx < lines.length && !lines[insertIdx].trim().startsWith('subGenre:')) {
            insertIdx++;
          }
          lines.splice(insertIdx, 0, hymnId);
          genreObj.content = lines.join('\n');
          modifiedGenreIds.push(gid);
          console.log(`  Inserted "${hymnId}" into ${genreObj.name} under subgenre "${targetSubgenre}".`);
        } else {
          // Create new subgenre section
          const trimmed = content.trim();
          genreObj.content = trimmed ? `${trimmed}\nsubGenre:${targetSubgenre}\n${hymnId}\n` : `subGenre:${targetSubgenre}\n${hymnId}\n`;
          modifiedGenreIds.push(gid);
          console.log(`  Created subgenre "${targetSubgenre}" in ${genreObj.name} with hymn "${hymnId}".`);
        }
      } else {
        // Append without subgenre
        const trimmed = content.trim();
        genreObj.content = trimmed ? `${trimmed}\n${hymnId}\n` : `${hymnId}\n`;
        modifiedGenreIds.push(gid);
        console.log(`  Appended "${hymnId}" to ${genreObj.name}.`);
      }
    }
  }

  // 8. Push Updates to Cloud Firestore (Live Admin Portal Data)
  console.log('\n🔄 Syncing updates to Cloud Firestore...');
  const hymnDocRef = doc(db, 'hymns', hymnId);
  await setDoc(hymnDocRef, {
    ...hymnRecord,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log(`  ✅ Firestore hymn synced: hymns/${hymnId}`);

  if (recordingRecord) {
    const recDocRef = doc(db, 'recordings', recordingRecord.id);
    await setDoc(recDocRef, {
      ...recordingRecord,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`  ✅ Firestore recording synced: recordings/${recordingRecord.id}`);
  }

  for (const gid of modifiedGenreIds) {
    const gObj = genresList.find(g => g.id === gid);
    if (gObj) {
      const gDocRef = doc(db, 'genres', gid);
      await setDoc(gDocRef, {
        content: gObj.content,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log(`  ✅ Firestore genre subgenres synced: genres/${gid}`);
    }
  }

  // 9. Rebuild Unified catalog.json Preserving Season Ranks
  console.log('\n🔄 Rebuilding static catalog snapshot...');
  const cantorsMap = new Map(cantors.map(c => [c.id, c]));
  const sortedGenres = [...genresList].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name));
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

  const hymnsJsonStr = JSON.stringify(hymns, null, 2);
  const recordingsJsonStr = JSON.stringify(recordings, null, 2);
  const genresJsonStr = JSON.stringify(sortedGenres, null, 2);
  const catalogJsonStr = JSON.stringify(catalog, null, 2);

  // 10. Write to All Target Locations (Web and Mobile)
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    try {
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, 'hymns.json'), hymnsJsonStr, 'utf-8');
        fs.writeFileSync(path.join(dir, 'recordings.json'), recordingsJsonStr, 'utf-8');
        fs.writeFileSync(path.join(dir, 'genres.json'), genresJsonStr, 'utf-8');
        fs.writeFileSync(path.join(dir, 'catalog.json'), catalogJsonStr, 'utf-8');
        console.log(`  ✅ Synced all catalog files to: ${dir}`);
      }
    } catch (e: any) {
      console.warn(`  ⚠️ Could not write to ${dir}:`, e.message);
    }
  }

  // 11. Push Live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog snapshot to Firebase Storage CDN...');
  try {
    const downloadUrl = await uploadCatalogToStorage();
    console.log(`  🔗 Live CDN Snapshot URL: ${downloadUrl}`);
  } catch (storageErr: any) {
    console.warn('  ⚠️ Warning: Failed to upload catalog to Firebase Storage:', storageErr.message);
  }

  console.log(`\n🎉 PUBLISH COMPLETE: "${name}" is live in Cloud Firestore, local JSON, and Edge CDN!`);
}

// CLI Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const hymnId = getArg('--hymn-id');
  const name = getArg('--name');
  const genresStr = getArg('--genres') || '';
  const subgenre = getArg('--subgenre');
  const description = getArg('--description');
  const cantorId = getArg('--cantor');
  const modeStr = getArg('--mode') || 'learn';
  const audioLengthStr = getArg('--audio-length');
  const audioFilePath = getArg('--audio-file');
  const markersFilePath = getArg('--markers-file');
  const lyricsMappingFilePath = getArg('--lyrics-mapping-file');

  if (!hymnId || !name) {
    console.error(`
Usage: npx tsx src/scripts/publish-hymn.ts \\
  --hymn-id <id> \\
  --name <name> \\
  --genres <g1,g2> \\
  [--subgenre <subgenreName>] \\
  [--cantor <cantorId>] \\
  [--audio-file <path>] \\
  [--audio-length <seconds>] \\
  [--markers-file <path>] \\
  [--lyrics-mapping-file <path>] \\
  [--description <desc>] \\
  [--mode <learn|listen>]
`);
    process.exit(1);
  }

  publishHymnToCatalog({
    hymnId,
    name,
    genres: genresStr.split(',').map(s => s.trim()).filter(Boolean),
    subgenre,
    description,
    cantorId,
    mode: modeStr as 'learn' | 'listen',
    audioLength: audioLengthStr ? parseFloat(audioLengthStr) : undefined,
    audioFilePath,
    markersFilePath,
    lyricsMappingFilePath,
  }).catch(err => {
    console.error('Fatal publish error:', err);
    process.exit(1);
  });
}
