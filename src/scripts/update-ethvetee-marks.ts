
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
    369.497298,
    376.989356,
    385.230143,
    412.658889,
    418.599932,
    426.830459,
    434.238174,
    454.377491,
    465.209338,
    474.823851,
    482.782594,
    489.993478,
    500.271946,
    507.643499,
    516.507774,
    531.536112,
    557.494496,
    565.567058,
    573.056104,
    587.320402
];

// The ID of the document to update
const documentId = 'cantor-ibrahim_ethvetee-general-funeral';

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
