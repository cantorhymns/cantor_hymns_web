
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// --- Data for the new Recording ---

const recordingId = 'hics_je-efesmaroout-lent-weekdays';
const recordingData = {
    hymnId: "je-efesmaroout-lent-weekdays",
    cantorId: "hics",
    audioUrl: "tracks/hics/hics_je-efesmaroout-lent-weekdays.mp3",
    markersUrl: "markers/hics/hics_je-efesmaroout-lent-weekdays_markers.txt",
    audioLength: 143.5950833333333,
    active: true,
    mode: "listen"
};

// --- End of Data ---


async function addNewRecording() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to add new recording...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');
        
        // Add/Update the Recording document
        const recordingRef = doc(db, 'recordings', recordingId);
        const recordingDoc = await getDoc(recordingRef);
        if (recordingDoc.exists()) {
             console.log(`Recording "${recordingId}" already exists. Overwriting with new data.`);
        } else {
            console.log(`Adding new recording: "${recordingId}"`);
        }
        await setDoc(recordingRef, recordingData);
        console.log('Recording document created/updated successfully.');
        
        console.log(`\n--- Operation Complete ---`);
        console.log(`Successfully added recording '${recordingId}' for existing hymn 'je-efesmaroout-lent-weekdays'.`);


    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        process.exit(0);
    }
}

addNewRecording();
