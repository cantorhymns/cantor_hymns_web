import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const hymnId = 'tribes';
const recordingId = 'cantor-ibrahim_tribes';

const hymnData = {
    name: "Tribes of Israel",
    description: "The names of the 12 tribes of Israel sealed, chanted in the 7th chapter of the Book of Revelation.",
    genreId: ["holy-week"],
    genreRank: { "holy-week": 60 },
    subGenreId: { "holy-week": "Bright Saturday" },
    lyricsArabic: "Lyrics/Arabic/tribes_arabic.md",
    lyricsCoptic: "Lyrics/Coptic/tribes_coptic.md",
    lyricsEnglish: "Lyrics/English/tribes_english.md"
};

const recordingData = {
    hymnId: "tribes",
    cantorId: "cantor-ibrahim",
    audioUrl: "CantorIbrahim/cantor_ibrahim-tribes.mp3",
    marks: [
        17.910778, 33.915423, 40.446036, 52.561047, 65.966594,
        78.878557, 95.431845, 113.445450, 123.966992, 149.409169,
        165.822632, 183.740235, 204.193749, 235.279091
    ],
    active: true,
    mode: "learn"
};

async function addTribesHymn() {
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
        
        console.log(`\n--- Operation Complete ---\nNote: The 'holy-week' genre was not modified. For the hymn to appear under a "Bright Saturday" section, the 'subGenres' array in the 'holy-week' document may need to be updated manually or with another script.`);

    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        process.exit(0);
    }
}

addTribesHymn();
