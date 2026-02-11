
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    12.970522,
    26.303855,
    38.231293,
    51.156463,
    63.582766,
    76.507937,
    88.163265,
    101.405896,
    127.845805,
    139.546485,
    152.562358,
    164.671202,
    178.004535,
    189.433107,
    203.356009,
    215.011338,
    228.843537,
    241.133787,
    255.283447,
    283.195555,
    295.984671,
    309.408707,
    322.618840,
    336.541743,
    349.602967,
    362.845598,
    390.538734,
    403.055741,
    416.071614,
    428.689389,
    442.140896,
    454.703254
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_yodas';

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
