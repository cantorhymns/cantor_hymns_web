
import { getFirestoreAdmin, getStorageAdmin } from '../firebase/server';
import { firebaseConfig } from '../firebase/config';

async function validateAudioUrls() {
  try {
    console.log('--- Starting Audio File Validation ---');
    
    const db = getFirestoreAdmin();
    const bucket = getStorageAdmin().bucket(firebaseConfig.storageBucket);

    const recordingsRef = db.collection('recordings');
    const recordingsSnapshot = await recordingsRef.get();
    const totalDocs = recordingsSnapshot.docs.length;

    if (totalDocs === 0) {
      console.log('No recordings found to validate.');
      process.exit(0);
      return;
    }

    console.log(`Found ${totalDocs} recordings. Checking each audio file's existence in Storage...`);
    
    const missingFiles: { id: string, path: string }[] = [];
    const validationPromises = recordingsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const audioUrl = data.audioUrl;

        if (!audioUrl || typeof audioUrl !== 'string') {
            console.warn(`  - WARNING: Document ${doc.id} has no 'audioUrl' field. Skipping.`);
            return;
        }

        const [exists] = await bucket.file(audioUrl).exists();

        if (!exists) {
            missingFiles.push({ id: doc.id, path: audioUrl });
        }
    });

    await Promise.all(validationPromises);
    
    console.log('\n--- Validation Complete ---');

    if (missingFiles.length > 0) {
        console.error(`\nFound ${missingFiles.length} missing audio files:`);
        missingFiles.forEach(mf => {
            console.error(`  - Recording ID: ${mf.id}, Missing Path: gs://${bucket.name}/${mf.path}`);
        });
        console.error('\nPlease upload the missing files to Firebase Storage at the paths listed above.');
    } else {
        console.log('\n✅ All audio URLs point to existing files in Firebase Storage. Your data is consistent!');
    }

  } catch (error) {
    console.error('An error occurred during the validation process:', error);
  } finally {
    process.exit(0);
  }
}

validateAudioUrls();
