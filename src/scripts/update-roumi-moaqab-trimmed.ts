import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

interface HymnUpdate {
  id: string;
  name: string;
  audioLength: number;
}

const hymnUpdates: HymnUpdate[] = [
  { id: 'roumi-1', name: 'Roumi 1', audioLength: 168.3 },
  { id: 'moaqab-1', name: "Mo'aqab 1", audioLength: 212.9 },
  { id: 'roumi-2', name: 'Roumi 2', audioLength: 153.0 },
  { id: 'moaqab-2', name: "Mo'aqab 2", audioLength: 219.8 },
  { id: 'roumi-3', name: 'Roumi 3', audioLength: 147.2 },
  { id: 'moaqab-3', name: "Mo'aqab 3", audioLength: 152.5 },
  { id: 'roumi-4', name: 'Roumi 4', audioLength: 147.4 },
  { id: 'moaqab-4', name: "Mo'aqab 4", audioLength: 156.1 },
  { id: 'roumi-5', name: 'Roumi 5', audioLength: 154.4 },
  { id: 'moaqab-5', name: "Mo'aqab 5", audioLength: 166.8 },
  { id: 'roumi-6', name: 'Roumi 6', audioLength: 149.1 },
  { id: 'moaqab-6', name: "Mo'aqab 6", audioLength: 163.9 },
  { id: 'roumi-7', name: 'Roumi 7', audioLength: 140.8 },
  { id: 'moaqab-7', name: "Mo'aqab 7", audioLength: 166.0 },
  { id: 'roumi-8', name: 'Roumi 8', audioLength: 142.8 },
  { id: 'moaqab-8', name: "Mo'aqab 8", audioLength: 176.9 },
  { id: 'roumi-9', name: 'Roumi 9', audioLength: 143.85 },
  { id: 'moaqab-9', name: "Mo'aqab 9", audioLength: 147.2 },
];

const cantorId = 'cantor-tharwat';

async function main() {
  console.log(`\n🚀 Updating 18 Roumi & Mo'aqab hymns (trimmed intros & concise names)...`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log('Authenticating anonymously to Firebase Storage...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.');

  // 1. Upload newly trimmed audio tracks to Firebase Storage
  console.log('\n📤 Uploading trimmed audio tracks to Firebase Storage...');
  for (const h of hymnUpdates) {
    const recordingId = `${cantorId}_${h.id}`;
    const mp3Local = `staging/tracks/cantor-tharwat/${recordingId}.mp3`;
    const mp3Storage = `tracks/${cantorId}/${recordingId}.mp3`;

    if (fs.existsSync(mp3Local)) {
      console.log(`Uploading track: ${mp3Storage} (${h.name})...`);
      const buffer = fs.readFileSync(mp3Local);
      await uploadBytes(ref(storage, mp3Storage), buffer, { contentType: 'audio/mpeg' });
      console.log(`✅ Uploaded ${recordingId}.mp3`);
    } else {
      console.warn(`⚠️ Warning: local file ${mp3Local} not found!`);
    }
  }

  // 2. Load and update local database files
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  // Update names in hymns.json and durations in recordings.json
  for (const h of hymnUpdates) {
    const recordingId = `${cantorId}_${h.id}`;

    const exHymnIdx = hymns.findIndex(x => x.id === h.id);
    if (exHymnIdx >= 0) {
      hymns[exHymnIdx].name = h.name;
    }

    const exRecIdx = recordings.findIndex(r => r.id === recordingId);
    if (exRecIdx >= 0) {
      recordings[exRecIdx].audioLength = h.audioLength;
    }
  }

  // 3. Rebuild unified catalog.json
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

  // 4. Write to all target locations (Web & Mobile)
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'hymns.json'), JSON.stringify(hymns, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'genres.json'), JSON.stringify(genresList, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced catalog files to: ${dir}`);
    }
  }

  // 5. Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 ALL 18 TRACKS AND NAMES SUCCESSFULLY UPDATED!');
}

main().catch(err => {
  console.error('Fatal error updating hymns:', err);
  process.exit(1);
});
