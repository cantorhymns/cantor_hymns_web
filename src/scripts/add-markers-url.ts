
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, DocumentData } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

async function addMarkersUrl() {
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
        const totalDocs = recordingsSnapshot.docs.length;

        if (recordingsSnapshot.empty) {
            console.log('No recordings found in the database. Nothing to update.');
            process.exit(0);
            return;
        }

        console.log(`Found ${totalDocs} recordings. Staging updates...`);

        const batches: any[] = [writeBatch(db)];
        let currentBatchIndex = 0;
        let operationsInCurrentBatch = 0;

        for (const docSnap of recordingsSnapshot.docs) {
            const data = docSnap.data() as DocumentData;
            const cantorId = data.cantorId;

            if (!cantorId) {
                console.warn(`  - WARNING: Document ${docSnap.id} has no 'cantorId' field. Skipping.`);
                continue;
            }

            const markersUrl = `markers/${cantorId}/${docSnap.id}_markers.txt`;
            
            if (operationsInCurrentBatch === 499) {
                batches.push(writeBatch(db));
                currentBatchIndex++;
                operationsInCurrentBatch = 0;
            }
            
            batches[currentBatchIndex].update(docSnap.ref, { markersUrl: markersUrl });
            operationsInCurrentBatch++;
        }
        
        if (operationsInCurrentBatch > 0) {
             console.log(`\nStaged updates for ${totalDocs} documents. Committing ${batches.length} batch(es)...`);
             for (let i = 0; i < batches.length; i++) {
                 console.log(`Committing batch ${i+1}/${batches.length}...`)
                 await batches[i].commit();
             }
             console.log('All recording documents have been successfully updated with the new markersUrl field.');
        } else {
             console.log('\nNo documents needed an update.');
        }

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        process.exit(0);
    }
}

addMarkersUrl();
