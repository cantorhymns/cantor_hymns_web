import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const hymnId = 'stones';
const recordingId = 'cantor-ibrahim_stones';

const hymnData = {
    name: "The Stones",
    description: "The names of the 12 precious stones used for the foundation of the walls of the city, chanted in the 21st chapter of the Book of Revelation.",
    genreId: ["holy-week"],
    genreRank: { "holy-week": 70 },
    subGenreId: { "holy-week": "Bright Saturday" },
    lyricsArabic: "lyrics/arabic/stones_arabic.md",
    lyricsCoptic: "lyrics/coptic/stones_coptic.md",
    lyricsEnglish: "lyrics/english/stones_english.md"
};

const recordingData = {
    hymnId: "stones",
    cantorId: "cantor-ibrahim",
    audioUrl: "CantorIbrahim/cantor-ibrahim_stones.mp3",
    marks: [
        55.927356,
        82.114639,
        93.337469,
        103.946186,
        140.313342,
        162.106755,
        186.980222,
        197.651161,
        206.577812,
        238.430057,
        263.348830,
        274.650867,
        284.993297,
        321.040756,
        347.416640,
        357.545824,
        366.822024
    ],
    active: true,
    mode: "learn"
};

async function addStonesHymn() {
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

addStonesHymn();
