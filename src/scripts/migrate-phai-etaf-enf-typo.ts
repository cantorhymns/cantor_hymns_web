
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

const oldDocId = 'cantor-ibrahim_phat-etaf-enf';
const newDocId = 'cantor-ibrahim_phai-etaf-enf';

async function fixTypo() {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    try {
        console.log('Authenticating anonymously...');
        await signInAnonymously(auth);
        console.log('Authentication successful.');

        const oldDocRef = doc(db, 'recordings', oldDocId);
        const newDocRef = doc(db, 'recordings', newDocId);

        await runTransaction(db, async (transaction) => {
            console.log(`Attempting to read document: ${oldDocId}`);
            const oldDoc = await transaction.get(oldDocRef);

            if (!oldDoc.exists()) {
                console.log(`Document "${oldDocId}" does not exist. Checking if new document "${newDocId}" already exists.`);
                const newDoc = await transaction.get(newDocRef);
                if (newDoc.exists()) {
                    console.log('New document already exists. Migration has likely already been run. No action taken.');
                } else {
                     console.log(`Neither old nor new document exists. Nothing to migrate.`);
                }
                return;
            }

            const data = oldDoc.data();
            console.log(`Found data in ${oldDocId}. Migrating to ${newDocId}...`);

            // Create the new document with the old data
            transaction.set(newDocRef, data);
            
            // Delete the old document
            transaction.delete(oldDocRef);
            
            console.log('Transaction prepared: create new document and delete old one.');
        });

        console.log(`Successfully migrated document from "${oldDocId}" to "${newDocId}".`);

    } catch (error) {
        console.error('An error occurred during the migration process:', error);
    } finally {
        // End the script process
        process.exit(0);
    }
}

fixTypo();
