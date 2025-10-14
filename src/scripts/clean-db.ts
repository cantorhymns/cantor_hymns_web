
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// --- Source of Truth ---
// These are the only cantors and hymns that should exist in the database.
const APPROVED_CANTORS = ['CantorBola', 'CantorGad', 'CantorIbrahim', 'CantorTharwat', 'HICS'];
const APPROVED_HYMN_NAMES = ['Tai Shouri', 'O Monogenees', 'Tarh', 'Kata Ni Khoros', 'Phai Etafenf'];
// --- End of Source of Truth ---

async function cleanDatabase() {
  try {
    console.log('Authenticating anonymously...');
    await signInAnonymously(auth);
    console.log('Authentication successful.');

    console.log('Starting to clean the database...');
    const batch = writeBatch(db);

    // --- 1. Clean Recordings ---
    const recordingsRef = collection(db, 'recordings');
    const recordingsSnapshot = await getDocs(recordingsRef);
    const seenHymnCantorPairs = new Set<string>();
    let deletedRecordingsCount = 0;

    console.log(`Analyzing ${recordingsSnapshot.docs.length} existing recordings...`);

    for (const doc of recordingsSnapshot.docs) {
      const recording = doc.data();
      const cantor = recording.cantor;
      const hymnId = recording.hymnId;
      const pair = `${hymnId}-${cantor}`;

      // Condition 1: Delete if cantor is not approved
      if (!APPROVED_CANTORS.includes(cantor)) {
        console.log(`- Deleting recording ${doc.id} by unapproved cantor: ${cantor}`);
        batch.delete(doc.ref);
        deletedRecordingsCount++;
        continue; // Move to the next recording
      }

      // Condition 2: Delete if it's a duplicate hymn/cantor combination
      if (seenHymnCantorPairs.has(pair)) {
        console.log(`- Deleting duplicate recording ${doc.id} for hymn/cantor: ${pair}`);
        batch.delete(doc.ref);
        deletedRecordingsCount++;
      } else {
        seenHymnCantorPairs.add(pair);
      }
    }

    // --- 2. Clean Hymns ---
    const hymnsRef = collection(db, 'hymns');
    const hymnsSnapshot = await getDocs(hymnsRef);
    let deletedHymnsCount = 0;

    console.log(`Analyzing ${hymnsSnapshot.docs.length} existing hymns...`);

    for (const doc of hymnsSnapshot.docs) {
      const hymn = doc.data();
      const hymnName = hymn.name;

      // Condition 3: Delete if hymn name is not approved
      // We check for the base name, ignoring parenthetical parts like "(Mournful)"
      const baseHymnName = hymnName.split(' (')[0];
      if (!APPROVED_HYMN_NAMES.includes(baseHymnName)) {
        console.log(`- Deleting unapproved hymn: ${hymnName} (ID: ${doc.id})`);
        batch.delete(doc.ref);
        deletedHymnsCount++;
      }
    }

    if (deletedRecordingsCount === 0 && deletedHymnsCount === 0) {
        console.log('Database is already clean. No changes were needed.');
    } else {
        // Commit all the deletions
        await batch.commit();
        console.log(`Cleanup complete. Deleted ${deletedRecordingsCount} recordings and ${deletedHymnsCount} hymns.`);
    }

  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    process.exit(0);
  }
}

cleanDatabase();
