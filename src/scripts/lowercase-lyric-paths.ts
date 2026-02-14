import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, DocumentData } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

async function lowercaseLyricPaths() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to update documents...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const hymnsRef = collection(db, 'hymns');
        console.log('Fetching all hymn documents...');
        const hymnsSnapshot = await getDocs(hymnsRef);

        if (hymnsSnapshot.empty) {
            console.log('No hymns found in the database. Nothing to update.');
            return;
        }
        
        console.log(`Found ${hymnsSnapshot.docs.length} hymns. Checking for paths to update...`);

        const batch = writeBatch(db);
        let updatedDocsCount = 0;

        hymnsSnapshot.forEach((docSnap) => {
            const hymn = docSnap.data() as DocumentData;
            const updates: { [key: string]: any } = {};
            let needsUpdate = false;

            ['lyricsEnglish', 'lyricsCoptic', 'lyricsArabic'].forEach(field => {
                if (hymn[field] && typeof hymn[field] === 'string') {
                    const originalPath = hymn[field];
                    const lowercasedPath = originalPath.toLowerCase();
                    if (originalPath !== lowercasedPath) {
                        updates[field] = lowercasedPath;
                        needsUpdate = true;
                    }
                }
            });

            if (needsUpdate) {
                console.log(`- Staging update for hymn: ${docSnap.id} (${hymn.name})`);
                batch.update(docSnap.ref, updates);
                updatedDocsCount++;
            }
        });

        if (updatedDocsCount > 0) {
            console.log(`\nFound ${updatedDocsCount} documents to update. Committing changes...`);
            await batch.commit();
            console.log('All hymn documents have been successfully updated.');
        } else {
            console.log('\nNo documents needed updates. All lyric paths are already lowercase.');
        }

    } catch (error) {
        console.error('An error occurred during the update process:', error);
    } finally {
        process.exit(0);
    }
}

lowercaseLyricPaths();
