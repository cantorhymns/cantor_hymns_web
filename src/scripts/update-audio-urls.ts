import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, DocumentData, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

async function updateAudioUrls() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to update documents...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const recordingsRef = collection(db, 'recordings');
        console.log('Fetching all recording documents...');
        const recordingsSnapshot = await getDocs(recordingsRef);

        if (recordingsSnapshot.empty) {
            console.log('No recordings found in the database. Nothing to update.');
            return;
        }

        console.log(`Found ${recordingsSnapshot.docs.length} recordings. Checking for paths to update...`);

        // Use a list of batches to handle more than 500 documents
        const batches: any[] = [writeBatch(db)];
        let currentBatchIndex = 0;
        let operationsInCurrentBatch = 0;
        let docsToUpdateCount = 0;

        for (const docSnap of recordingsSnapshot.docs) {
            const data = docSnap.data() as DocumentData;
            const cantorId = data.cantorId;
            const hymnId = data.hymnId;

            if (!cantorId || !hymnId) {
                console.warn(`  - Skipping document ${docSnap.id} due to missing 'cantorId' or 'hymnId'.`);
                continue;
            }

            const newAudioUrl = `tracks/${cantorId}/${docSnap.id}.mp3`;
            
            if (data.audioUrl !== newAudioUrl) {
                console.log(`- Staging update for recording: ${docSnap.id}`);
                docsToUpdateCount++;
                
                if (operationsInCurrentBatch === 499) {
                    batches.push(writeBatch(db));
                    currentBatchIndex++;
                    operationsInCurrentBatch = 0;
                }
                
                batches[currentBatchIndex].update(docSnap.ref, { audioUrl: newAudioUrl });
                operationsInCurrentBatch++;
            }
        }
        
        if (docsToUpdateCount > 0) {
             console.log(`\nFound ${docsToUpdateCount} documents to update. Committing ${batches.length} batch(es)...`);
             for (let i = 0; i < batches.length; i++) {
                 console.log(`Committing batch ${i+1}/${batches.length}...`)
                 await batches[i].commit();
             }
             console.log('All recording documents have been successfully updated.');
        } else {
             console.log('\nNo documents needed updates. All audio URLs are already in the new format.');
        }

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        process.exit(0);
    }
}

updateAudioUrls();
