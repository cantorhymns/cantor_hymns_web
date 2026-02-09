
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    15.925170,
    28.637188,
    41.761905,
    56.251701,
    70.421769,
    79.317460,
    91.569161,
    102.099773,
    117.893424,
    138.455782,
    148.263039,
    165.746032,
    181.773243,
    189.074830,
    198.566893,
    212.331066,
    226.897959,
    243.696145,
    261.303855,
    291.517007,
    322.126984,
    353.471655,
    385.816327,
    418.031746,
    450.562358,
    483.401361,
    516.333333,
    549.725624,
    583.800454,
    617.981859,
    651.920635,
    685.770975
];

// The ID of the document to update
const documentId = 'cantor-bola_psalm-150-lent';

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
