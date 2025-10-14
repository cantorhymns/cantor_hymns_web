
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { firebaseConfig } from '../firebase/config';
import { genres, hymns, recordings } from '../lib/seed-data';

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function seedDatabase() {
  try {
    console.log('Starting to seed the database...');

    const batch = writeBatch(db);

    // Seed Genres
    console.log(`Seeding ${genres.length} genres...`);
    genres.forEach((genre) => {
      const docRef = doc(db, 'genres', genre.id);
      batch.set(docRef, {
        name: genre.name,
        description: genre.description,
        icon: genre.icon,
      });
    });

    // Seed Hymns
    console.log(`Seeding ${hymns.length} hymns...`);
    hymns.forEach((hymn) => {
      const docRef = doc(db, 'hymns', hymn.id);
      batch.set(docRef, {
        name: hymn.name,
        genreId: hymn.genreId,
      });
    });

    // Seed Recordings
    console.log(`Seeding ${recordings.length} recordings...`);
    recordings.forEach((recording) => {
      // Create a new document with an auto-generated ID in the 'recordings' collection
      const docRef = doc(collection(db, 'recordings'));
      batch.set(docRef, recording);
    });

    // Commit the batch
    await batch.commit();

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    // Firebase doesn't have a simple 'close' for the client-side SDK.
    // The script will exit automatically.
    process.exit(0);
  }
}

seedDatabase();
