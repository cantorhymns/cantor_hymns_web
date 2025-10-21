
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { genres, hymns, recordings } from '../lib/seed-data';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

async function deleteCollection(collectionName: string) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) {
        console.log(`Collection '${collectionName}' is already empty.`);
        return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Successfully deleted ${snapshot.size} documents from '${collectionName}'.`);
}


async function seedDatabase() {
  try {
    console.log('Authenticating anonymously...');
    await signInAnonymously(auth);
    console.log('Authentication successful.');

    console.log('--- Starting Database Reset ---');
    
    // Delete existing data
    await deleteCollection('recordings');
    await deleteCollection('hymns');
    await deleteCollection('genres');
    
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
      seedBatch.set(docRef, recording);
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
