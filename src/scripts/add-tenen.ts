import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

// --- Data for the new Hymn and Recording ---

const hymnId = 'tenen';
const hymnData = {
    name: "Tenen",
    description: "Psali Watos for the Three Saintly Children, chanted in Midnight Praises during the month of Kiahk and on Bright Saturday.",
    genreId: ["kiahk"],
    lyricsArabic: "lyrics/arabic/tenen_arabic.md",
    lyricsCoptic: "lyrics/coptic/tenen_coptic.md",
    lyricsEnglish: "lyrics/english/tenen_english.md"
};

const recordingId = 'cantor-gad_tenen';
const recordingData = {
    hymnId: "tenen",
    cantorId: "cantor-gad",
    audioUrl: "tracks/cantor-gad/cantor-gad_tenen.mp3",
    markersUrl: "markers/cantor-gad/cantor-gad_tenen_markers.txt",
    audioLength: 1252.3,
    active: true,
    mode: "learn"
};

// Files to upload to Firebase Storage
const storageFiles = [
    {
        localPath: 'staging/lyrics/coptic/tenen_coptic.md',
        storagePath: 'lyrics/coptic/tenen_coptic.md',
        contentType: 'text/markdown; charset=utf-8'
    },
    {
        localPath: 'staging/lyrics/english/tenen_english.md',
        storagePath: 'lyrics/english/tenen_english.md',
        contentType: 'text/markdown; charset=utf-8'
    },
    {
        localPath: 'staging/lyrics/arabic/tenen_arabic.md',
        storagePath: 'lyrics/arabic/tenen_arabic.md',
        contentType: 'text/markdown; charset=utf-8'
    },
    {
        localPath: 'staging/markers/cantor-gad/cantor-gad_tenen_markers.txt',
        storagePath: 'markers/cantor-gad/cantor-gad_tenen_markers.txt',
        contentType: 'text/plain; charset=utf-8'
    },
    {
        localPath: 'staging/markers/cantor-gad/cantor-gad_tenen_lyrics_markers.txt',
        storagePath: 'markers/cantor-gad/cantor-gad_tenen_lyrics_markers.txt',
        contentType: 'text/plain; charset=utf-8'
    },
    {
        localPath: 'staging/tracks/cantor-gad/cantor-gad_tenen.mp3',
        storagePath: 'tracks/cantor-gad/cantor-gad_tenen.mp3',
        contentType: 'audio/mpeg'
    }
];

async function addTenen() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const storage = getStorage(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        // 1. Upload files to Firebase Storage
        console.log('\n--- Uploading Files to Firebase Storage ---');
        for (const item of storageFiles) {
            const fullLocal = path.resolve(process.cwd(), item.localPath);
            if (!fs.existsSync(fullLocal)) {
                console.warn(`Local file missing: ${fullLocal}, skipping.`);
                continue;
            }
            const buffer = fs.readFileSync(fullLocal);
            const storageRef = ref(storage, item.storagePath);
            console.log(`Uploading ${item.localPath} (${(buffer.length / 1024).toFixed(1)} KB) -> ${item.storagePath}...`);
            try {
                await uploadBytes(storageRef, buffer, { contentType: item.contentType });
                console.log(`  ✅ Successfully uploaded ${item.storagePath}`);
            } catch (err: any) {
                console.error(`  ❌ Failed to upload ${item.storagePath}:`, err.message);
            }
        }

        // 2. Add/Update the Hymn document
        console.log('\n--- Updating Firestore Documents ---');
        const hymnRef = doc(db, 'hymns', hymnId);
        const hymnDoc = await getDoc(hymnRef);

        if (hymnDoc.exists()) {
            console.log(`Hymn "${hymnId}" already exists. Overwriting with new data.`);
        } else {
            console.log(`Adding new hymn: "${hymnId}"`);
        }
        await setDoc(hymnRef, hymnData);
        console.log('Hymn document created/updated successfully.');

        // 3. Add/Update the Recording document
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

addTenen();
