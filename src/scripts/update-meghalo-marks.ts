
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    11.519274,
    28.208617,
    48.616780,
    72.426304,
    86.712018,
    102.131519,
    120.226757,
    144.988662,
    166.530612,
    185.941043,
    199.818594,
    240.680272,
    252.607710,
    263.083900,
    282.721088,
    294.104308,
    306.439909,
    322.811791,
    341.179138,
    371.609977,
    397.369615,
    409.160998,
    419.274376,
    445.442177,
    464.943311,
    475.419501,
    490.793651,
    511.836735,
    523.038549,
    544.807256,
    570.657596,
    582.086168,
    592.108844,
    618.458050,
    638.730159,
    649.886621,
    736.403628,
    794.683934,
    852.467245,
    909.954475,
    968.169895
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_meghalo';

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
