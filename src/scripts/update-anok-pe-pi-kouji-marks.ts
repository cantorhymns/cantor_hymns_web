
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    22.811791,
    43.174603,
    53.469388,
    60.226757,
    80.272109,
    95.566893,
    110.895692,
    120.102041,
    131.349206,
    143.956916,
    168.083900,
    190.215420,
    205.197060,
    215.854657,
    226.648307,
    251.224271,
    273.750348,
    288.228806,
    298.296834,
    309.056471,
    332.770756,
    354.890938,
    369.641505,
    379.845586,
    390.283228,
    401.983908,
    411.462366,
    426.532661,
    436.782094,
    443.992979,
    453.652843,
    463.183455,
    486.144906,
    500.113160,
    514.081414,
    528.373931,
    542.101822,
    555.026992,
    563.054203,
    574.890938,
    586.101822,
    601.974838,
    618.437423,
    626.695926,
    638.546267,
    655.278693,
    665.076879,
    682.537196,
    696.311023,
    709.372248,
    722.750932,
    736.129617,
    749.417599,
    763.657962,
    789.521907,
    802.855241,
    815.553654,
    828.297418,
    852.524175,
    865.585400,
    878.057055,
    890.710116,
    915.653427
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_anok-pe-pi-kouji';

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
