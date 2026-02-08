
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    13.197279,
    28.027211,
    37.052154,
    45.532880,
    53.922902,
    60.997732,
    70.658275,
    77.551700,
    90.567573,
    98.821541,
    104.804208,
    117.823808,
    125.647169,
    136.304765,
    147.687985,
    155.164920,
    161.378072,
    168.543605,
    172.848391,
    179.992955,
    185.138641,
    194.380914,
    200.231254,
    204.494293,
    212.657558,
    221.047581,
    231.478420,
    242.045313,
    248.439871,
    258.736505,
    263.498410,
    273.158274,
    282.409974,
    288.441720,
    294.895326,
    303.552751,
    310.439154,
    316.017385,
    326.584279,
    340.008315,
    349.896980,
    365.838533,
    376.450778,
    388.332864,
    397.571508,
    413.788622
];

// The ID of the document to update has been corrected
const documentId = 'cantor-ibrahim_phai-etaf-enf';

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
