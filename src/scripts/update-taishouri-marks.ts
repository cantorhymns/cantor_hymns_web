
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    37.995524, 49.922961, 65.070354, 79.673528, 98.721147, 124.616839, 139.401420, 164.979651, 
    179.718880, 199.859469, 214.553347, 224.031805, 242.943370, 258.045410, 267.705274, 286.493469, 
    301.141996, 327.854014, 341.278050, 353.341542, 366.992336, 382.321134, 392.842676, 406.176009, 
    418.330204, 433.477596, 452.842676, 467.717959, 494.021814, 507.717959, 520.416372
];

// The ID of the document to update
const documentId = 'cantor-bola_tai-shouri';

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
