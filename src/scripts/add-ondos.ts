import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// --- Data for the new Hymn and Recording ---

const hymnId = 'ondos';
const hymnData = {
    name: "Ondos",
    description: "A hymn for the apostles of Jesus Christ. Chanted before reading the Catholic Epistle.",
    genreId: ["apostles-fast"],
    lyricsArabic: "lyrics/arabic/ondos_arabic.md",
    lyricsCoptic: "lyrics/coptic/ondos_coptic.md",
    lyricsEnglish: "lyrics/english/ondos_english.md"
};

const recordingId = 'hics_ondos';
const recordingData = {
    hymnId: "ondos",
    cantorId: "hics",
    audioUrl: "tracks/hics/hics_ondos.mp3",
    markersUrl: "markers/hics/hics_ondos_markers.txt",
    audioLength: 1689.44325,
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
        console.log(`Note: If the 'apostles-fast' genre is new, make sure it is added to your 'genres' collection for it to appear in the app.`);

    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        process.exit(0);
    }
}

addNewRecording();
