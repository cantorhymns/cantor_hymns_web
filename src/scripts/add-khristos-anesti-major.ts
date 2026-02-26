
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// --- Data for the new Hymn and Recording ---

const hymnId = 'khristos-anesti-major';
const hymnData = {
    name: "Khristos Anesti (Major)",
    description: "The hymn of the resurrection, Khristos Anesti, in its major tune.",
    genreId: ["resurrection"],
    lyricsArabic: "lyrics/arabic/khristos-anesti-arabic.md",
    lyricsCoptic: "lyrics/coptic/khristos-anesti-coptic.md",
    lyricsEnglish: "lyrics/english/khristos-anesti_english.md"
};

const recordingId = 'cantor-ibrahim_khristos-anesti-major';
const recordingData = {
    hymnId: "khristos-anesti-major",
    cantorId: "cantor-ibrahim",
    audioUrl: "tracks/cantor-ibrahim/cantor-ibrahim_khristos-anesti-major.mp3",
    markersUrl: "markers/cantor-ibrahim/cantor-ibrahim_khristos-anesti-major_markers.txt",
    audioLength: 289.5412083333333,
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
        console.log(`Adding/Updating hymn: "${hymnId}"`);
        await setDoc(hymnRef, hymnData);
        console.log('Hymn document created/updated successfully.');
        
        // 2. Add/Update the Recording document
        const recordingRef = doc(db, 'recordings', recordingId);
        console.log(`Adding/Updating recording: "${recordingId}"`);
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
