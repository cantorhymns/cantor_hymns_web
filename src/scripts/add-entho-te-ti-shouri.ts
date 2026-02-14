
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const hymnId = 'entho-te-ti-shouri';
const recordingId = 'cantor-bola_entho-te-ti-shouri';

const hymnData = {
    name: "Entho Te Ti-Shouri",
    description: "Hymn of the censer chanted in the weekdays of Holy Lent.",
    genreId: ["lent"],
    genreRank: { "lent": 15 },
    subGenreId: { "lent": "Liturgy Weekdays" },
    lyricsArabic: "lyrics/arabic/entho-te-ti-shouri_arabic.md",
    lyricsCoptic: "lyrics/coptic/entho-te-ti-shouri_coptic.md",
    lyricsEnglish: "lyrics/english/entho-te-ti-shouri_english.md"
};

const recordingData = {
    hymnId: "entho-te-ti-shouri",
    cantorId: "cantor-bola",
    audioUrl: "tracks/cantor-bola/cantor-bola_entho-te-ti-shouri.mp3",
    markersUrl: "markers/cantor-bola/cantor-bola_entho-te-ti-shouri_markers.txt",
    active: true,
    mode: "learn"
};

async function addEnthoTeTiShouriHymn() {
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
        
        console.log(`\n--- Operation Complete ---\nNote: If the 'lent' genre or the 'Liturgy Weekdays' sub-genre are new, you may need to add them to your 'genres' collection manually or with another script.`);

    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        process.exit(0);
    }
}

addEnthoTeTiShouriHymn();
