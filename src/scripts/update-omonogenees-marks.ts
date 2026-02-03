
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    13.154195,
    24.172336,
    37.807256,
    50.278912,
    61.435374,
    74.603175,
    92.607710,
    107.800454,
    117.904762,
    137.632653,
    149.482993,
    162.907029,
    179.777778,
    193.943326,
    212.492079,
    226.868496,
    241.256251,
    257.773258,
    274.682506,
    286.714301,
    305.083866,
    319.696111,
    336.748265,
    361.829898,
    374.711984,
    387.278878,
    409.630352,
    433.711984,
    474.446678,
    493.065726,
    506.909263,
    524.663145,
    549.123463,
    561.787862,
    574.091717,
    601.286728,
    627.409177,
    639.466363,
    684.688054,
    702.898938,
    717.336580,
    734.427268,
    748.939740,
    759.960148,
    772.529309,
    785.379649,
    807.080330,
    826.717518,
    865.892121,
    884.014253,
    919.841917,
    935.216067
];

// The ID of the document to update
const documentId = 'cantor-bola_omonogenees';

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
