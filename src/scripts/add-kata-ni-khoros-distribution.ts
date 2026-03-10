import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// --- Data for the new Hymn and Recording ---

const hymnId = 'kata-ni-khoros-distribution';
const hymnData = {
    name: "Kata Ni-Khoros (Distribution)",
    description: "Chanted during the Distribution of the Holy Mysteries from the Feast of Resurrection until the 39th day of the Holy Fifty Days.",
    genreId: ["resurrection"],
    lyricsArabic: "lyrics/arabic/kata-ni-khoros-distribution_arabic.md",
    lyricsCoptic: "lyrics/coptic/kata-ni-khoros-distribution_coptic.md",
    lyricsEnglish: "lyrics/english/kata-ni-khoros-distribution_english.md"
};

const recordingId = 'cantor-ibrahim_kata-ni-khoros-distribution';
const recordingData = {
    hymnId: "kata-ni-khoros-distribution",
    cantorId: "cantor-ibrahim",
    audioUrl: "tracks/cantor-ibrahim/cantor-ibrahim_kata-ni-khoros-distribution.mp3",
    markersUrl: "markers/cantor-ibrahim/cantor-ibrahim_kata-ni-khoros-distribution_markers.txt",
    audioLength: 532.8718333333334,
    active: true,
    mode: "learn"
};

// --- End of Data ---

async function addNewRecording() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to add new documents...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        // 1. Add/Update the Hymn document
        const hymnRef = doc(db, 'hymns', hymnId);
        const hymnDoc = await getDoc(hymnRef);

        if (hymnDoc.exists()) {
            console.log(`Hymn "${hymnId}" already exists. Overwriting with new data.`);
        } else {
            console.log(`Adding new hymn: "${hymnId}"`);
        }
        await setDoc(hymnRef, hymnData);
        console.log('Hymn document created/updated successfully.');
        
        // 2. Add/Update the Recording document
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
        console.log(`Successfully added hymn '${hymnId}' and recording '${recordingId}'.`);

    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        process.exit(0);
    }
}

addNewRecording();
