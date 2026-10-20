import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

async function exportFirestore() {
  console.log('Connecting to Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  try {
    console.log('Authenticating anonymously...');
    await signInAnonymously(auth);
  } catch (err) {
    console.warn('Anonymous auth failed or skipped, proceeding with public read rules:', err);
  }

  const collections = ['genres', 'cantors', 'hymns', 'recordings'];
  const outputDir = path.resolve(process.cwd(), 'data');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const exportData: Record<string, any[]> = {};

  for (const colName of collections) {
    console.log(`Fetching collection: "${colName}"...`);
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    
    const docs = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    exportData[colName] = docs;
    const filePath = path.join(outputDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`Saved ${docs.length} ${colName} to ${filePath}`);
  }

  // Also build an all-in-one compiled catalog.json for super-fast offline bundle & zero-join reads
  const { genres, cantors, hymns, recordings } = exportData;

  const cantorsMap = new Map(cantors.map(c => [c.id, c]));

  const catalog = {
    generatedAt: new Date().toISOString(),
    genres: genres.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    cantors: cantors.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    hymns: hymns.map(h => {
      const hymnRecordings = recordings
        .filter(r => r.hymnId === h.id && r.active !== false)
        .map(r => ({
          ...r,
          cantor: cantorsMap.get(r.cantorId) || undefined
        }));

      return {
        ...h,
        recordings: hymnRecordings
      };
    }).sort((a, b) => a.name.localeCompare(b.name))
  };

  const catalogPath = path.join(outputDir, 'catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`Compiled unified catalog (${catalog.hymns.length} hymns) to ${catalogPath}`);

  console.log('\n✅ Firestore Export Complete!');
  console.log(`Summary:
- Genres: ${genres.length}
- Cantors: ${cantors.length}
- Hymns: ${hymns.length}
- Recordings: ${recordings.length}
Output directory: ${outputDir}`);
}

exportFirestore().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
