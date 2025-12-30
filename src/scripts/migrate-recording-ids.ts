
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, DocumentData } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

async function migrateRecordingIds() {
  try {
    console.log('Authenticating anonymously...');
    await signInAnonymously(auth);
    console.log('Authentication successful.');

    console.log('--- Starting Recording ID Migration ---');

    const recordingsRef = collection(db, 'recordings');
    const recordingsSnapshot = await getDocs(recordingsRef);
    const totalDocs = recordingsSnapshot.docs.length;

    if (totalDocs === 0) {
      console.log('No recordings found to migrate.');
      return;
    }

    console.log(`Found ${totalDocs} recordings to process.`);

    // Firestore allows up to 500 operations in a single batch.
    // Each migration is 2 operations (1 set, 1 delete), so a batch can handle 250 documents.
    const batchSize = 250;
    let processedCount = 0;

    for (let i = 0; i < totalDocs; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = recordingsSnapshot.docs.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

        for (const oldDoc of chunk) {
            const data = oldDoc.data() as DocumentData;
            const cantorId = data.cantorId;
            const hymnId = data.hymnId;

            if (!cantorId || !hymnId) {
                console.warn(`  - Skipping document ${oldDoc.id} due to missing 'cantorId' or 'hymnId'.`);
                continue;
            }

            const newDocId = `${cantorId}_${hymnId}`;
            
            // Check if we are trying to overwrite an existing new-format ID from a previous run
            if (oldDoc.id === newDocId) {
                console.log(`  - Document ${oldDoc.id} already has the new ID format. Skipping.`);
                continue;
            }

            const newDocRef = doc(db, 'recordings', newDocId);
            
            console.log(`  - Migrating ${oldDoc.id} -> ${newDocId}`);

            // Set the new document with the same data
            batch.set(newDocRef, data);
            
            // Delete the old document
            batch.delete(oldDoc.ref);
        }

        // Commit the batch
        await batch.commit();
        processedCount += chunk.length;
        console.log(`Batch committed. ${processedCount}/${totalDocs} documents processed.`);
    }

    console.log('--- Recording ID Migration Completed Successfully ---');

  } catch (error) {
    console.error('Error during recording ID migration:', error);
  } finally {
    // End the script process
    process.exit(0);
  }
}

migrateRecordingIds();
