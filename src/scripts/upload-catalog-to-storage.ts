import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

export async function uploadCatalogToStorage() {
  console.log('Connecting to Firebase...');
  const app = initializeApp(firebaseConfig);
  const storage = getStorage(app);
  const auth = getAuth(app);

  try {
    await signInAnonymously(auth);
    console.log('Authenticated anonymously.');
  } catch (err) {
    console.warn('Anonymous auth note:', err);
  }

  const catalogPath = path.resolve(process.cwd(), 'src/data/catalog.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`catalog.json not found at ${catalogPath}`);
  }

  const buffer = fs.readFileSync(catalogPath);
  console.log(`Read catalog.json (${(buffer.length / 1024).toFixed(1)} KB)`);

  const storageRef = ref(storage, 'data/catalog.json');
  await uploadBytes(storageRef, buffer, {
    contentType: 'application/json; charset=utf-8',
    cacheControl: 'public, max-age=60', // 1 minute CDN cache
  });
  console.log('✅ Uploaded to Firebase Storage: data/catalog.json');

  const downloadUrl = await getDownloadURL(storageRef);
  console.log('🔗 Public Download URL:', downloadUrl);
  return downloadUrl;
}

if (require.main === module) {
  uploadCatalogToStorage()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Upload failed:', err);
      process.exit(1);
    });
}
