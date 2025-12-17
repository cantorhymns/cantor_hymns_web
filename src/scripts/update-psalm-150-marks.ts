
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// The new list of marks for the specific recording
const newMarks = [
    16.143336, 24.306601, 47.254447, 56.778256, 71.608188, 87.980071, 98.456261, 118.320207,
    139.635399, 148.252179, 161.909776, 180.639934, 197.238574, 208.576442, 223.950592,
    246.898438, 267.533359, 295.379163, 329.099003, 360.173833, 391.332563, 422.223719,
    452.362041, 482.69991, 514.31669, 544.386985, 570.40966, 596.797415, 625.278141,
    653.579728, 670.860907, 699.296282, 716.076327, 729.046849, 752.040046, 768.729388,
    782.289479, 797.255465, 810.135284, 825.509434, 843.468617, 866.869978, 890.094468,
    906.661361, 920.040046, 945.890386, 976.502631
];

async function updatePsalm150Marks() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to perform update...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const recordingsRef = collection(db, 'recordings');
        const q = query(recordingsRef, where('hymnId', '==', 'psalm-150'), where('cantorId', '==', 'cantor-ibrahim'));

        console.log("Searching for the 'Psalm 150' recording by 'Cantor Ibrahim'...");
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error("Error: Could not find the specified recording. No documents match the query.");
            return;
        }

        if (querySnapshot.size > 1) {
            console.warn("Warning: Found multiple recordings matching the criteria. Updating all of them.");
        }

        for (const doc of querySnapshot.docs) {
            console.log(`Found recording with ID: ${doc.id}. Updating marks...`);
            await updateDoc(doc.ref, {
                marks: newMarks
            });
            console.log(`Successfully updated marks for document ${doc.id}.`);
        }

        console.log('Update script finished.');

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        process.exit(0);
    }
}

updatePsalm150Marks();
