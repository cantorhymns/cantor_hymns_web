import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n🎵 Publishing verse markers for Al-Tarh (Cantor Gad)...`);

  const gadMarkers = [
    16.22, 22.69, 37.16, 51.18, 64.29, 78.95, 93.32, 108.96, 121.84, 132.64,
    142.04, 148.26, 161.62, 173.94, 187.14, 207.05, 223.28, 232.56, 248.10, 256.82,
    266.63, 278.12, 288.54, 298.40, 321.14, 336.66, 353.12, 370.80, 385.89, 400.27,
    418.72, 434.72, 455.84, 470.14, 488.80, 507.05, 513.66, 530.42, 536.49, 545.38,
    562.80, 574.15, 588.44, 601.01, 614.35, 628.79, 644.36, 665.62, 681.56, 689.97,
    693.48, 705.34, 718.54, 725.40, 743.02, 748.12, 754.57, 764.29, 771.19, 781.07,
    786.09, 791.89, 802.07, 829.94, 853.34, 879.49, 888.80, 906.44, 927.06, 939.29,
    951.56, 962.88, 973.52, 976.89, 992.06, 1014.29, 1027.69, 1042.26, 1053.46, 1066.21,
    1076.29, 1092.32, 1103.84, 1116.54, 1137.26, 1157.34, 1168.34, 1185.52, 1195.46, 1206.62,
    1251.87, 1274.69, 1295.74, 1311.62, 1324.06
  ];

  const recordingId = 'cantor-gad_tarh';
  const cantorId = 'cantor-gad';
  const hymnId = 'tarh';

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

  const markersDir = path.resolve(process.cwd(), `staging/markers/${cantorId}`);
  if (!fs.existsSync(markersDir)) {
    fs.mkdirSync(markersDir, { recursive: true });
  }

  const markersContent = gadMarkers.map(m => m.toFixed(2)).join('\n');
  const localMarkersFile = path.join(markersDir, `${recordingId}_markers.txt`);
  fs.writeFileSync(localMarkersFile, markersContent, 'utf-8');

  // Upload to Firebase Storage
  const storageMarkersPath = `markers/${cantorId}/${recordingId}_markers.txt`;
  console.log(`☁️ Uploading marker files for ${recordingId} to Storage...`);
  await uploadBytes(ref(storage, storageMarkersPath), Buffer.from(markersContent, 'utf-8'), {
    contentType: 'text/plain; charset=utf-8',
  });

  // Update in-memory recordings
  const recIdx = recordings.findIndex(r => r.id === recordingId);
  if (recIdx >= 0) {
    recordings[recIdx].markers = gadMarkers;
    recordings[recIdx].markersCount = gadMarkers.length;
    recordings[recIdx].mode = 'learn';
    recordings[recIdx].markersUrl = storageMarkersPath;

    // Primary source of truth write to Cloud Firestore
    const recDocRef = doc(db, 'recordings', recordingId);
    await setDoc(
      recDocRef,
      {
        markers: gadMarkers,
        markersCount: gadMarkers.length,
        mode: 'learn',
        markersUrl: storageMarkersPath,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ ${recordingId}: Updated in Firestore and Storage (${gadMarkers.length} markers)`);
  } else {
    console.warn(`⚠️ Recording ${recordingId} not found in recordings.json!`);
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
    if (!fs.existsSync(dir)) {
      console.warn(`Directory not found (skipping): ${dir}`);
      continue;
    }
    fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
    fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
    console.log(`✅ Synced files to: ${dir}`);
  }

  // Upload live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();

  console.log('\n🎉 CANTOR GAD AL-TARH MARKERS SUCCESSFULLY REPLICATED & LIVE!\n');
}

main().catch(err => {
  console.error('❌ Error publishing markers:', err);
  process.exit(1);
});
