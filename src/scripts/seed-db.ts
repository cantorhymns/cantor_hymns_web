
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection, getDocs, query, limit, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { genres, hymns, recordings, cantors } from '../lib/seed-data';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

async function deleteCollection(collectionName: string) {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, limit(500)); // Firestore batch limit

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(q, resolve, reject);
    });
}

async function deleteQueryBatch(q: any, resolve: () => void, reject: (reason?: any) => void) {
    try {
        const snapshot = await getDocs(q);
        if (snapshot.size === 0) {
            // When there are no documents left, we are done
            console.log(`Collection is now empty.`);
            resolve();
            return;
        }

        // Delete documents in a batch
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Deleted ${snapshot.size} documents...`);

        // Recurse on the same query to delete next batch
        process.nextTick(() => {
            deleteQueryBatch(q, resolve, reject);
        });
    } catch (error) {
        reject(error);
    }
}


async function seedDatabase() {
  try {
    console.log('Authenticating anonymously...');
    await signInAnonymously(auth);
    console.log('Authentication successful.');

    console.log('--- Starting Database Reset ---');
    
    // Delete existing data
    console.log("Deleting 'recordings' collection...");
    await deleteCollection('recordings');
    console.log("Deleting 'hymns' collection...");
    await deleteCollection('hymns');
    console.log("Deleting 'genres' collection...");
    await deleteCollection('genres');
    console.log("Deleting 'cantors' collection...");
    await deleteCollection('cantors');
    
    console.log('--- Database cleared. Starting to seed... ---');

    const seedBatch = writeBatch(db);

    // Seed Genres
    console.log(`Seeding ${genres.length} genres...`);
    genres.forEach((genre) => {
      const docRef = doc(db, 'genres', genre.id);
      seedBatch.set(docRef, {
        name: genre.name,
        description: genre.description,
        icon: genre.icon,
      });
    });

    // Seed Cantors
    console.log(`Seeding ${cantors.length} cantors...`);
    cantors.forEach((cantor) => {
        const docRef = doc(db, 'cantors', cantor.id);
        seedBatch.set(docRef, { name: cantor.name });
    });

    // Seed Hymns
    console.log(`Seeding ${hymns.length} hymns...`);
    hymns.forEach((hymn) => {
      const docRef = doc(db, 'hymns', hymn.id);
      seedBatch.set(docRef, {
        name: hymn.name,
        genreId: hymn.genreId,
      });
    });

    // Seed Recordings
    console.log(`Seeding ${recordings.length} recordings...`);
    recordings.forEach((recording) => {
      // Create a new document with an auto-generated ID in the 'recordings' collection
      const docRef = doc(collection(db, 'recordings'));
      seedBatch.set(docRef, {
        hymnId: recording.hymnId,
        cantorId: recording.cantorId,
        audioUrl: recording.audioUrl,
        marks: recording.marks
      });
    });

    // Commit the batch
    await seedBatch.commit();

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seed process:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
