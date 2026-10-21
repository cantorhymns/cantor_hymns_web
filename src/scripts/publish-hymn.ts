import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';

interface PublishOptions {
  hymnId: string;
  name: string;
  genres: string[];
  description?: string;
  cantorId: string;
  mode: 'learn' | 'listen';
  audioLength?: number;
  filesToUpload?: { localPath: string; storagePath: string; contentType?: string }[];
}

export async function publishHymnToCatalog(options: PublishOptions) {
  const { hymnId, name, genres, description, cantorId, mode, audioLength, filesToUpload } = options;

  console.log(`\n📦 Publishing "${name}" (${hymnId}) for cantor "${cantorId}"...`);

  // 1. Upload files to Firebase Storage if provided
  if (filesToUpload && filesToUpload.length > 0) {
    console.log('Connecting to Firebase Storage...');
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const auth = getAuth(app);

    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.warn('Anonymous auth note:', err);
    }

    for (const f of filesToUpload) {
      if (!fs.existsSync(f.localPath)) {
        console.warn(`⚠️ Warning: local file "${f.localPath}" not found, skipping storage upload.`);
        continue;
      }
      console.log(`Uploading ${f.localPath} -> ${f.storagePath}...`);
      const fileBuffer = fs.readFileSync(f.localPath);
      const storageRef = ref(storage, f.storagePath);
      await uploadBytes(storageRef, fileBuffer, {
        contentType: f.contentType || 'text/plain',
      });
      console.log(`✅ Uploaded: ${f.storagePath}`);
    }
  }

  // 2. Read existing catalog JSON files
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  // 3. Upsert Hymn
  const existingHymnIndex = hymns.findIndex(h => h.id === hymnId);
  const hymnRecord = {
    id: hymnId,
    name,
    genreId: genres,
    description: description || '',
    lyricsEnglish: `lyrics/english/${hymnId}_english.md`,
    lyricsCoptic: `lyrics/coptic/${hymnId}_coptic.md`,
    lyricsArabic: `lyrics/arabic/${hymnId}_arabic.md`,
  };

  if (existingHymnIndex >= 0) {
    hymns[existingHymnIndex] = { ...hymns[existingHymnIndex], ...hymnRecord };
    console.log(`Updated hymn entry for "${hymnId}".`);
  } else {
    hymns.push(hymnRecord);
    hymns.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Added new hymn entry for "${hymnId}".`);
  }

  // 4. Upsert Recording
  const recordingId = `${cantorId}_${hymnId}`;
  const existingRecIndex = recordings.findIndex(r => r.id === recordingId);
  const recordingRecord = {
    id: recordingId,
    hymnId,
    cantorId,
    audioUrl: `tracks/${cantorId}/${recordingId}.mp3`,
    markersUrl: `markers/${cantorId}/${recordingId}_markers.txt`,
    audioLength: audioLength || 0,
    active: true,
    mode: mode || 'learn',
  };

  if (existingRecIndex >= 0) {
    recordings[existingRecIndex] = { ...recordings[existingRecIndex], ...recordingRecord };
    console.log(`Updated recording entry for "${recordingId}".`);
  } else {
    recordings.push(recordingRecord);
    console.log(`Added new recording entry for "${recordingId}".`);
  }

  // 5. Rebuild unified catalog.json
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

  // 6. Write to all target locations
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'hymns.json'), JSON.stringify(hymns, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`Synced catalog to: ${dir}`);
    }
  }

  // 7. Push live to Firebase Storage (instant sync across web & mobile)
  console.log('\n☁️ Pushing updated catalog to Firebase Storage for live sync...');
  try {
    await uploadCatalogToStorage();
    console.log('✅ Catalog is live on Firebase Storage!');
  } catch (storageErr) {
    console.warn('⚠️ Warning: Failed to upload catalog to Firebase Storage:', storageErr);
  }

  console.log(`\n🎉 Successfully published "${name}" to JSON catalog across web and mobile!`);
}

// CLI Execution support
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const hymnId = getArg('--hymn-id');
  const name = getArg('--name');
  const genresStr = getArg('--genres') || '';
  const description = getArg('--description');
  const cantorId = getArg('--cantor');
  const modeStr = getArg('--mode') || 'learn';
  const audioLengthStr = getArg('--audio-length');

  if (!hymnId || !name || !cantorId) {
    console.error('Usage: npx tsx src/scripts/publish-hymn.ts --hymn-id <id> --name <name> --genres <g1,g2> --cantor <cantor-id> [--description <desc>] [--mode <learn|listen>] [--audio-length <seconds>]');
    process.exit(1);
  }

  publishHymnToCatalog({
    hymnId,
    name,
    genres: genresStr.split(',').map(s => s.trim()).filter(Boolean),
    description,
    cantorId,
    mode: modeStr as 'learn' | 'listen',
    audioLength: audioLengthStr ? parseFloat(audioLengthStr) : undefined,
  }).catch(err => {
    console.error('Publish failed:', err);
    process.exit(1);
  });
}
