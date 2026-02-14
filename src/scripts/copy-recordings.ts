import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const recordingMigrations = [
    { from: 'hics_tai-shouri', to: 'hics_mournful-tai-shouri' },
    { from: 'cantor-tharwat_tai-shouri', to: 'cantor-tharwat_mournful-tai-shouri' },
    { from: 'cantor-bola_tai-shouri', to: 'cantor-bola_mournful-tai-shouri' },
    { from: 'cantor-bola_psalm-150-lent', to: 'cantor-bola_psalm-150-lent-weekdays' }
];

async function copyRecordings() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously to copy documents...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        for (const migration of recordingMigrations) {
            const oldDocRef = doc(db, 'recordings', migration.from);
            const newDocRef = doc(db, 'recordings', migration.to);

            console.log(`\nProcessing: ${migration.from} -> ${migration.to}`);

            const oldDocSnap = await getDoc(oldDocRef);

            if (!oldDocSnap.exists()) {
                console.log(`  - Source document "${migration.from}" not found. Skipping.`);
                continue;
            }

            const newDocSnap = await getDoc(newDocRef);
            if (newDocSnap.exists()) {
                console.log(`  - Destination document "${migration.to}" already exists. Skipping to avoid overwrite.`);
                continue;
            }

            const data = oldDocSnap.data();
            await setDoc(newDocRef, data);
            console.log(`  - Successfully copied "${migration.from}" to "${migration.to}".`);
        }

        console.log('\n--- Document copying process complete. ---');

    } catch (error) {
        console.error('An error occurred during the copy process:', error);
    } finally {
        process.exit(0);
    }
}

copyRecordings();
