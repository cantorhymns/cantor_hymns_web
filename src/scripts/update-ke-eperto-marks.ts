
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    6.984127,
    13.151927,
    25.442177,
    39.863946,
    54.603175,
    61.451247,
    77.142857,
    93.560091,
    107.508786,
    115.399942,
    129.685657,
    145.558673,
    157.168650,
    165.388038,
    175.456065,
    185.932255,
    200.354024,
    212.236110,
    225.569444,
    240.490079,
    253.478545,
    261.669217,
    276.879906,
    297.618940,
    311.386344,
    327.077954,
    339.504258,
    348.030335,
    358.837447,
    368.402776,
    384.910712,
    401.373297,
    411.804136,
    419.241778,
    426.815474,
    439.378640,
    453.952167,
    462.773912,
    480.687744,
    493.885023,
    508.034683,
    529.771769,
    567.059380,
    581.046992,
    596.839118,
    617.016947,
    637.120714
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_ke-eperto';

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
