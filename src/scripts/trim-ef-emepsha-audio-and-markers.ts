import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Starting publish of trimmed Ef-Emepsha Ghar audio & updated markers...');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const db = getFirestore(app);

  console.log('Authenticating anonymously to Firebase...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.\n');

  // 1. Upload audio file
  const localAudioPath = path.resolve(process.cwd(), 'staging/tracks/cantor-ibrahim/cantor-ibrahim_ef-emepsha-ghar-kiahk-weekends.mp3');
  const storageAudioPath = 'tracks/cantor-ibrahim/cantor-ibrahim_ef-emepsha-ghar-kiahk-weekends.mp3';

  if (!fs.existsSync(localAudioPath)) {
    throw new Error(`Audio file not found at ${localAudioPath}`);
  }

  const audioBuffer = fs.readFileSync(localAudioPath);
  console.log(`☁️ Uploading trimmed audio (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB) to ${storageAudioPath}...`);
  await uploadBytes(ref(storage, storageAudioPath), audioBuffer, {
    contentType: 'audio/mpeg',
  });
  console.log('✅ Audio uploaded successfully.');

  // 2. Updated Markers (35 markers for 36 verses, marker 35 fixed to 1008.95)
  const ibrahimMarkers = [
    62.25,   // V2: Pef-ran holj
    117.90,  // V3: Owoh enten-ti-o-ou
    173.30,  // V4: Owoh enten-osh evol
    221.10,  // V5: Shere ne... epsot en-Adam nem Eva
    247.35,  // V6: Shere ne... ef-rashi en-Abel
    273.20,  // V7: Shere ne... ti-kivotos ente Noe
    299.15,  // V8: Shere ne... pi-ehmot en-Avraam
    322.90,  // V9: Shere ne... epsoti en-Isaak
    348.70,  // V10: Shere ne... ep-thelel em-peniot Yakob
    377.50,  // V11: Shere ne... ep-shoushou en-Iouda
    402.60,  // V12: Shere ne... ti-theoria ente Moysis
    428.30,  // V13: Shere ne... etjom en-Iisou nem Gedeon
    453.45,  // V14: Shere ne... ethmet-jori en-Samouel
    476.40,  // V15: Shere ne... ti-hypomoni ente Yob
    500.20,  // V16: Shere ne... etsheri en-David pi-ouro
    524.50,  // V17: Shere ne... tishferi en-Solomon
    549.40,  // V18: Shere ne... ti-profitia en-Isaias
    575.05,  // V19: Shere ne... ep-harma en-Ezekiel
    599.10,  // V20: Shere ne... ep-chisi en-Elias
    626.85,  // V21: Shere ne... pi-ehmot en-Eliseos
    650.55,  // V22: Shere ne... ef-rashi en-ni-angelos
    675.70,  // V23: Shere ne... ep-taio en-ni-patriarkhis
    704.20,  // V24: Shere ne... ef-las en-ni-apostolos
    729.25,  // V25: Shere ne... pi-khlom en-ni-martyros
    756.15,  // V26: Shere ne... ep-tajro en-ni-ekklisia
    781.25,  // V27: Shere ne... ti-moumi en-onkh
    806.45,  // V28: Shere ne... pi-sperma ente p-Israel
    831.35,  // V29: Shere ne... et-hefso en-ni-stavroforos
    853.57,  // V30: Ten-tiho ari-pen-mevi
    880.90,  // V31: Ethref-tajron khen pi-nahti
    910.05,  // V32: Entef-areh e-pen-manes-o-ou
    944.05,  // V33: Entef-shop erof en-nen-evki
    965.17,  // V34: Entef-ti nan en-ou-parisia
    983.02,  // V35: Ten-ti-o-ou ne
    1008.95, // V36: Ari-presvevin e-ehri ejon (Fixed from 1037.40)
  ];

  const markersDir = path.resolve(process.cwd(), 'staging/markers/cantor-ibrahim');
  if (!fs.existsSync(markersDir)) {
    fs.mkdirSync(markersDir, { recursive: true });
  }

  const markersContent = ibrahimMarkers.map(m => m.toFixed(2)).join('\n');
  const localMarkersFile = path.join(markersDir, 'cantor-ibrahim_ef-emepsha-ghar-kiahk-weekends_markers.txt');
  fs.writeFileSync(localMarkersFile, markersContent, 'utf-8');

  const storageMarkersPath = 'markers/cantor-ibrahim/cantor-ibrahim_ef-emepsha-ghar-kiahk-weekends_markers.txt';
  console.log(`☁️ Uploading updated markers to ${storageMarkersPath}...`);
  await uploadBytes(ref(storage, storageMarkersPath), Buffer.from(markersContent, 'utf-8'), {
    contentType: 'text/plain; charset=utf-8',
  });
  console.log('✅ Markers file uploaded.');

  // 3. Update Firestore document
  const recordingId = 'cantor-ibrahim_ef-emepsha-ghar-kiahk-weekends';
  const recDocRef = doc(db, 'recordings', recordingId);
  console.log(`📝 Updating Firestore document: recordings/${recordingId}...`);
  await updateDoc(recDocRef, {
    audioLength: 1037.0,
    markers: ibrahimMarkers,
    updatedAt: serverTimestamp(),
  });
  console.log('✅ Firestore document updated with audioLength = 1037.00 and Verse 36 marker = 1008.95.');

  // 4. Export from Firestore and upload updated catalog to Storage
  console.log('\n📦 Exporting from Firestore and updating catalog.json across all targets & CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog exported and uploaded to Storage CDN!');

  console.log('\n🎉 ALL DONE! Ef-Emepsha Ghar audio trim and marker update completed successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
