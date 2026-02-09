
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    17.324263,
    29.977324,
    51.843537,
    63.136054,
    76.469388,
    86.446712,
    105.630385,
    119.417234,
    133.657596,
    145.403628,
    160.414966,
    178.646259,
    199.099773,
    217.390023,
    231.585034,
    249.791383,
    271.922902,
    286.480726,
    302.353741,
    313.736961,
    336.285714
];

// The ID of the document to update
const documentId = 'cantor-bola_kyrie-eleison-lent';

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
