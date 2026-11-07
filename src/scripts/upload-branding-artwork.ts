import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
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

  const logoPath = path.resolve(process.cwd(), '../cantor_hymns_mobile/assets/images/logo.png');
  const buffer = fs.readFileSync(logoPath);
  console.log(`Read logo.png (${(buffer.length / 1024).toFixed(1)} KB)`);

  const storageRef = ref(storage, 'branding/logo.png');
  await uploadBytes(storageRef, buffer, {
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000',
  });
  console.log('✅ Uploaded to Firebase Storage: branding/logo.png');

  const downloadUrl = await getDownloadURL(storageRef);
  console.log('🔗 Public Download URL:', downloadUrl);
}

main().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
