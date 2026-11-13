import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n🚀 Ingesting & Publishing all 18 Roumi & Mo'aqab hymns for Cantor Ibrahim Ayad...`);

  const markersJsonPath = path.resolve(process.cwd(), 'staging/all_ibrahim_markers_verified.json');
  const durationsJsonPath = path.resolve(process.cwd(), 'staging/trimmed_durations.json');

  if (!fs.existsSync(markersJsonPath) || !fs.existsSync(durationsJsonPath)) {
    throw new Error('Markers or durations JSON file not found in staging!');
  }

  const markersData: Record<string, number[]> = JSON.parse(fs.readFileSync(markersJsonPath, 'utf-8'));
  const durationsData: Record<string, number[]> = JSON.parse(fs.readFileSync(durationsJsonPath, 'utf-8'));
  const cantorId = 'cantor-ibrahim';

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const db = getFirestore(app);

  console.log('Authenticating anonymously to Firebase Storage & Firestore...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.\n');

  const markersDir = path.resolve(process.cwd(), `staging/markers/${cantorId}`);
  if (!fs.existsSync(markersDir)) {
    fs.mkdirSync(markersDir, { recursive: true });
  }

  const allHymnIds = [
    'roumi-1', 'moaqab-1', 'roumi-2', 'moaqab-2', 'roumi-3', 'moaqab-3',
    'roumi-4', 'moaqab-4', 'roumi-5', 'moaqab-5', 'roumi-6', 'moaqab-6',
    'roumi-7', 'moaqab-7', 'roumi-8', 'moaqab-8', 'roumi-9', 'moaqab-9'
  ];

  for (const hid of allHymnIds) {
    const recordingId = `${cantorId}_${hid}`;
    const markers = markersData[hid];
    const audioLength = durationsData[hid];
    const numVerses = markers.length + 1;
    const lyricsMapping = Array.from({ length: numVerses }, (_, i) => i);

    console.log(`\n🎵 Processing ${recordingId} (${markers.length} markers, duration=${audioLength}s)...`);

    // 1. Upload audio track
    const localMp3 = path.resolve(process.cwd(), `staging/tracks/${cantorId}/${recordingId}.mp3`);
    const storageMp3 = `tracks/${cantorId}/${recordingId}.mp3`;

    if (!fs.existsSync(localMp3)) {
      throw new Error(`Audio file not found at ${localMp3}`);
    }

    const mp3Buffer = fs.readFileSync(localMp3);
    console.log(`  ☁️ Uploading audio (${(mp3Buffer.length / 1024 / 1024).toFixed(2)} MB) to ${storageMp3}...`);
    await uploadBytes(ref(storage, storageMp3), mp3Buffer, { contentType: 'audio/mpeg' });

    // 2. Prepare and upload marker text files
    const markersContent = markers.map(m => m.toFixed(2)).join('\n');
    const lyricsMarkersContent = lyricsMapping.join('\n');

    const localMarkersFile = path.join(markersDir, `${recordingId}_markers.txt`);
    const localLyricsMarkersFile = path.join(markersDir, `${recordingId}_lyrics_markers.txt`);

    fs.writeFileSync(localMarkersFile, markersContent, 'utf-8');
    fs.writeFileSync(localLyricsMarkersFile, lyricsMarkersContent, 'utf-8');

    const storageMarkersPath = `markers/${cantorId}/${recordingId}_markers.txt`;
    const storageLyricsMarkersPath = `markers/${cantorId}/${recordingId}_lyrics_markers.txt`;

    console.log(`  ☁️ Uploading markers to ${storageMarkersPath}...`);
    await uploadBytes(ref(storage, storageMarkersPath), Buffer.from(markersContent, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
    });

    await uploadBytes(ref(storage, storageLyricsMarkersPath), Buffer.from(lyricsMarkersContent, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
    });

    // 3. Write recording document to Cloud Firestore
    const recDocRef = doc(db, 'recordings', recordingId);
    await setDoc(
      recDocRef,
      {
        id: recordingId,
        hymnId: hid,
        cantorId: cantorId,
        audioUrl: storageMp3,
        audioLength: audioLength,
        markers: markers,
        lyricsMapping: lyricsMapping,
        markersUrl: storageMarkersPath,
        lyricsMappingUrl: storageLyricsMarkersPath,
        active: true,
        mode: 'learn',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ✅ Synced ${recordingId} to Cloud Firestore.`);
  }

  // 4. Export fresh database from Firestore and push unified catalog to Storage CDN
  console.log('\n📦 Exporting complete catalog from Cloud Firestore & syncing all mirrors...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog exported and uploaded to Storage CDN!');

  console.log('\n🎉 ALL 18 ROUMI & MOAQAB RECORDINGS FOR CANTOR IBRAHIM ARE LIVE!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during publishing:', err);
  process.exit(1);
});
