import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { publishHymnToCatalog } from './publish-hymn';
import * as fs from 'fs';
import * as path from 'path';

const hymnId = 'doxology-1-kiahk';
const cantorId = 'hics';
const recordingId = `${cantorId}_${hymnId}`;

async function main() {
  console.log(`\n🚀 Starting publication of "${hymnId}" by ${cantorId}...`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log('Authenticating anonymously...');
  await signInAnonymously(auth);
  console.log('Authenticated.');

  // 1. Files to upload
  const filesToUpload = [
    {
      localPath: 'staging/tracks/hics/hics_doxology-1-kiahk.mp3',
      storagePath: 'tracks/hics/hics_doxology-1-kiahk.mp3',
      contentType: 'audio/mpeg'
    },
    {
      localPath: 'staging/markers/hics/hics_doxology-1-kiahk_markers.txt',
      storagePath: 'markers/hics/hics_doxology-1-kiahk_markers.txt',
      contentType: 'text/plain; charset=utf-8'
    },
    {
      localPath: 'staging/markers/hics/hics_doxology-1-kiahk_lyrics_markers.txt',
      storagePath: 'markers/hics/hics_doxology-1-kiahk_lyrics_markers.txt',
      contentType: 'text/plain; charset=utf-8'
    },
    {
      localPath: 'staging/lyrics/coptic/doxology-1-kiahk_coptic.md',
      storagePath: 'lyrics/coptic/doxology-1-kiahk_coptic.md',
      contentType: 'text/markdown; charset=utf-8'
    },
    {
      localPath: 'staging/lyrics/english/doxology-1-kiahk_english.md',
      storagePath: 'lyrics/english/doxology-1-kiahk_english.md',
      contentType: 'text/markdown; charset=utf-8'
    },
    {
      localPath: 'staging/lyrics/arabic/doxology-1-kiahk_arabic.md',
      storagePath: 'lyrics/arabic/doxology-1-kiahk_arabic.md',
      contentType: 'text/markdown; charset=utf-8'
    }
  ];

  // 2. Update kiahk_content.txt in Firebase Storage
  console.log('\nUpdating kiahk_content.txt to include doxology-1-kiahk under subGenre:Vespers...');
  try {
    const contentRef = ref(storage, 'genres/content/kiahk_content.txt');
    const existingBytes = await getBytes(contentRef);
    let contentText = Buffer.from(existingBytes).toString('utf-8');

    if (!contentText.includes(hymnId)) {
      if (contentText.includes('subGenre:Vespers\n')) {
        contentText = contentText.replace(
          'subGenre:Vespers\n',
          `subGenre:Vespers\n${hymnId}\n`
        );
      } else {
        contentText += `\nsubGenre:Vespers\n${hymnId}\n`;
      }

      await uploadBytes(contentRef, Buffer.from(contentText, 'utf-8'), {
        contentType: 'text/plain; charset=utf-8'
      });
      console.log('✅ Successfully updated kiahk_content.txt in Firebase Storage.');
    } else {
      console.log('ℹ️ kiahk_content.txt already includes doxology-1-kiahk.');
    }
  } catch (err) {
    console.warn('⚠️ Could not update kiahk_content.txt automatically:', err);
  }

  // 3. Publish to JSON Catalog (Web & Mobile)
  await publishHymnToCatalog({
    hymnId,
    name: 'First Kiahk Doxology',
    genres: ['kiahk'],
    subGenreId: {
      kiahk: 'Vespers'
    },
    description: 'The First Doxology for the month of Kiahk and the Nativity Fast (Ke Ghar Aishansaji).',
    cantorId,
    mode: 'learn',
    audioLength: 226.25,
    filesToUpload
  });

  console.log(`\n🎉 First Kiahk Doxology published successfully!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to add First Kiahk Doxology:', err);
  process.exit(1);
});
