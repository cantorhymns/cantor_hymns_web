
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    17.469388,
    25.541950,
    37.922902,
    43.092971,
    56.335601,
    68.807256,
    76.925170,
    83.002268,
    91.165533,
    99.147392,
    115.201814,
    125.315193,
    135.791383,
    143.773243,
    156.517007,
    170.213152
];

// The ID of the document to update
const documentId = 'cantor-bola_share-ephnouti';

async function updateMarks() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to perform update...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const recordingRef = doc(db, 'recordings', documentId);

        console.log(`Updating marks for document: ${documentId}`);
        await updateDoc(recordingRef, {
            marks: newMarks
        });

        console.log('Successfully updated marks.');

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        // End the script process
        process.exit(0);
    }
}

updateMarks();
