
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const hymnId = 'ti-epistolee';
const recordingId = 'cantor-tharwat_ti-epistolee';

const hymnData = {
    name: "Ti-Epistolee",
    description: "Mournful tune of the Pauline Epistle in the Sixth Hour of Good Friday. Notice the lack of the word 'peace' in the conclusion of the epistle.",
    genreId: ["holy-week"],
    genreRank: { "holy-week": 7 },
    subGenreId: { "holy-week": "Good Friday" },
    lyricsEnglish: "lyrics/english/ti-epistolee_english.md",
    lyricsCoptic: "lyrics/coptic/ti-epistolee_coptic.md",
    lyricsArabic: "lyrics/arabic/ti-epistolee_arabic.md"
};

const recordingData = {
    hymnId: "ti-epistolee",
    cantorId: "cantor-tharwat",
    audioUrl: "tracks/cantor-tharwat/cantor-tharwat_ti-epistolee.mp3",
    markersUrl: "markers/cantor-tharwat/cantor-tharwat_ti-epistolee_markers.txt",
    active: true,
    mode: "learn"
};

async function addTiEpistoleeHymn() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to add new documents...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const hymnRef = doc(db, 'hymns', hymnId);
        const recordingRef = doc(db, 'recordings', recordingId);

        // Check if hymn already exists, then create or overwrite.
        const hymnDoc = await getDoc(hymnRef);
        if (hymnDoc.exists()) {
            console.log(`Hymn "${hymnId}" already exists. Overwriting with new data.`);
        } else {
            console.log(`Adding new hymn: ${hymnId}`);
        }
        await setDoc(hymnRef, hymnData);
        console.log('Hymn document created/updated successfully.');
        
        // Check if recording already exists, then create or overwrite.
        const recordingDoc = await getDoc(recordingRef);
        if (recordingDoc.exists()) {
             console.log(`Recording "${recordingId}" already exists. Overwriting with new data.`);
        } else {
            console.log(`Adding new recording: ${recordingId}`);
        }
        await setDoc(recordingRef, recordingData);
        console.log('Recording document created/updated successfully.');
        
        console.log(`\n--- Operation Complete ---\nNote: The 'holy-week' genre was not modified. For the hymn to appear under a "Good Friday" section, you may need to add "Good Friday" to the 'subGenres' array in the 'holy-week' document if it doesn't already exist.`);

    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        process.exit(0);
    }
}

addTiEpistoleeHymn();
