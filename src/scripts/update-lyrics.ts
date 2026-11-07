import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';

export interface UpdateLyricsOptions {
  hymnId: string;
  copticText?: string;
  englishText?: string;
  arabicText?: string;
  copticFilePath?: string;
  englishFilePath?: string;
  arabicFilePath?: string;
}

export async function updateLyrics(options: UpdateLyricsOptions) {
  const { hymnId, copticFilePath, englishFilePath, arabicFilePath } = options;
  let { copticText, englishText, arabicText } = options;

  console.log(`\n📝 Updating lyrics for hymn: "${hymnId}"...`);

  // 1. Read files if paths are provided
  if (!copticText && copticFilePath && fs.existsSync(copticFilePath)) {
    copticText = fs.readFileSync(copticFilePath, 'utf-8').trim();
  }
  if (!englishText && englishFilePath && fs.existsSync(englishFilePath)) {
    englishText = fs.readFileSync(englishFilePath, 'utf-8').trim();
  }
  if (!arabicText && arabicFilePath && fs.existsSync(arabicFilePath)) {
    arabicText = fs.readFileSync(arabicFilePath, 'utf-8').trim();
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

  const hymnIdx = hymns.findIndex(h => h.id === hymnId);
  if (hymnIdx === -1) {
    throw new Error(`Hymn with ID "${hymnId}" not found in hymns.json`);
  }

  const existingLyrics = hymns[hymnIdx].lyrics || {};
  const updatedLyrics = {
    coptic: copticText !== undefined ? copticText : (existingLyrics.coptic || ''),
    english: englishText !== undefined ? englishText : (existingLyrics.english || ''),
    arabic: arabicText !== undefined ? arabicText : (existingLyrics.arabic || ''),
  };

  hymns[hymnIdx].lyrics = updatedLyrics;

  // 3. Update Cloud Firestore
  console.log('🔄 Syncing updated lyrics to Cloud Firestore...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  await signInAnonymously(auth);
  const hymnDocRef = doc(db, 'hymns', hymnId);
  await setDoc(
    hymnDocRef,
    {
      lyrics: updatedLyrics,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`  ✅ Cloud Firestore hymn "${hymnId}" updated.`);

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

  const hymnsJson = JSON.stringify(hymns, null, 2);
  const catalogJson = JSON.stringify(catalog, null, 2);

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'hymns.json'), hymnsJson, 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), catalogJson, 'utf-8');
      console.log(`  ✅ Synced: ${dir}`);
    }
  }

  // 6. Push to Firebase Storage CDN
  console.log('☁️ Uploading updated catalog to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log(`🎉 Lyrics for "${hymnId}" successfully updated and deployed!`);
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const hymnId = getArg('--hymn-id');
  const copticFilePath = getArg('--coptic-file');
  const englishFilePath = getArg('--english-file');
  const arabicFilePath = getArg('--arabic-file');

  if (!hymnId) {
    console.error('Usage: npx tsx src/scripts/update-lyrics.ts --hymn-id <id> [--coptic-file <path>] [--english-file <path>] [--arabic-file <path>]');
    process.exit(1);
  }

  updateLyrics({
    hymnId,
    copticFilePath,
    englishFilePath,
    arabicFilePath,
  }).catch(err => {
    console.error('Update lyrics failed:', err);
    process.exit(1);
  });
}
