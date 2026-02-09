
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    18.271826,
    27.160715,
    39.813776,
    52.104025,
    63.850057,
    72.738946,
    80.221939,
    97.591554,
    106.435091,
    114.825114,
    123.124433,
    132.512188,
    152.965703,
    181.083617,
    208.450964,
    235.618764,
    263.226474,
    291.054139,
    319.330783,
    331.122166,
    343.457767,
    358.831916,
    376.292234,
    392.664116,
    400.056406,
    429.398810,
    446.150447,
    458.039336,
    478.266093,
    490.737749,
    502.270628,
    517.554075,
    534.431626,
    550.499653,
    557.257023,
    611.331853
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_oukatee';

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
