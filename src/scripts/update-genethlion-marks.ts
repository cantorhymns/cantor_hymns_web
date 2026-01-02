
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    15.698413,
    31.882086,
    49.160998,
    64.629908,
    79.777301,
    89.210407,
    104.675260,
    133.155986,
    154.108367,
    180.140113,
    196.829455,
    214.471178,
    229.754625,
    246.580022,
    261.500657,
    287.396348,
    298.717138,
    311.687659,
    328.059541,
    338.535732,
    349.873600,
    364.159315,
    381.574281,
    391.733011,
    411.023260,
    434.286008,
    455.150244,
    478.133955,
    507.431007,
    519.131688,
    534.868649,
    553.644159,
    567.567062,
    577.861846,
    594.732595,
    608.700849,
    625.027379,
    637.272277,
    656.818763,
    672.827833,
    692.873184
];

// The ID of the document to update
const documentId = 'cantor-gad_genethlion';

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
