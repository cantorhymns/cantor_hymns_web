
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    18.049887,
    30.702948,
    48.369615,
    60.492063,
    81.172336,
    93.598639,
    103.621315,
    113.780045,
    129.925170,
    142.324263,
    163.512472,
    175.133787,
    184.798186,
    199.918367,
    219.519274,
    231.102041,
    241.079365,
    250.875283,
    266.839002,
    278.462585,
    421.272109,
    478.587302,
    558.097506,
    702.106576,
    760.780045,
    839.301587,
    897.618751,
    978.124420,
    1037.475894,
    1115.745735,
    1141.623286,
    1165.423740,
    1199.401064,
    1250.181109
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_mournful-agios';

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
