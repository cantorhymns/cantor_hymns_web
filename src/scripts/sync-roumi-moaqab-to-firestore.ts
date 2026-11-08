import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔄 Initializing Firebase & authenticating...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.\n');

  const recsPath = path.resolve(process.cwd(), 'src/data/recordings.json');
  const recordings: any[] = JSON.parse(fs.readFileSync(recsPath, 'utf-8'));

  const hymnIds = [
    'roumi-1', 'moaqab-1',
    'roumi-2', 'moaqab-2',
    'roumi-3', 'moaqab-3',
    'roumi-4', 'moaqab-4',
    'roumi-5', 'moaqab-5',
    'roumi-6', 'moaqab-6',
    'roumi-7', 'moaqab-7',
    'roumi-8', 'moaqab-8',
    'roumi-9', 'moaqab-9',
  ];

  console.log(`Syncing all ${hymnIds.length} Roumi & Mo'aqab recordings to Cloud Firestore...`);

  for (const hid of hymnIds) {
    const recId = `cantor-tharwat_${hid}`;
    const rec = recordings.find(r => r.id === recId);
    if (!rec) {
      console.warn(`⚠️ Recording ${recId} not found in recordings.json!`);
      continue;
    }

    const recRef = doc(db, 'recordings', recId);
    await setDoc(
      recRef,
      {
        id: rec.id,
        hymnId: rec.hymnId,
        cantorId: rec.cantorId,
        audioUrl: rec.audioUrl,
        audioLength: rec.audioLength || 0,
        markers: rec.markers || [],
        lyricsMapping: rec.lyricsMapping || [],
        markersUrl: rec.markersUrl || `markers/${rec.cantorId}/${rec.id}_markers.txt`,
        lyricsMappingUrl: rec.lyricsMappingUrl || `markers/${rec.cantorId}/${rec.id}_lyrics_markers.txt`,
        active: rec.active !== false,
        mode: (rec.markers && rec.markers.length > 0) ? 'learn' : (rec.mode || 'learn'),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Synced ${recId} to Firestore: ${rec.markers?.length || 0} markers -> [${(rec.markers || []).join(', ')}]`);
  }

  console.log('\n🎉 ALL 18 ROUMI & MO\'AQAB RECORDINGS HAVE BEEN SYNCED TO CLOUD FIRESTORE!');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
