
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    21.268745,
    34.478327,
    56.417294,
    80.874501,
    100.466338,
    116.694049,
    144.472260,
    158.438780,
    165.695016,
    176.564323,
    192.047513,
    205.381833,
    215.359157,
    230.848759,
    241.924695,
    249.424669,
    259.952371,
    273.693868,
    280.496589,
    290.746282,
    303.564229,
    310.593708,
    320.996084,
    333.920485,
    343.172185,
    349.929555,
    363.601607,
    376.989356,
    385.230143,
    412.658889,
    426.830459,
    445.184286,
    456.832516,
    471.366484,
    506.123107,
    514.072166,
    526.436282,
    535.969666
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_ethvetee-good-friday';

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
