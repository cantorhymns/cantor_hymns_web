
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    28.526077,
    42.494331,
    61.909297,
    71.705215,
    84.766440,
    92.839002,
    107.578231,
    119.959184,
    140.775510,
    169.437642,
    194.244898,
    218.054422,
    228.712018,
    239.369615,
    266.852608,
    281.637188,
    293.065760,
    318.916100,
    333.068027,
    351.571429,
    371.662132,
    379.099773,
    391.707483,
    416.832200,
    441.532880,
    480.741497,
    503.532880,
    527.251701,
    576.490636,
    596.853448,
    606.105148,
    625.470228
];

// The ID of the document to update
const documentId = 'cantor-bola_alleluia-al-asr';

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
