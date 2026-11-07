import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log(`\n🗑️ Removing descriptions from all 18 Roumi & Mo'aqab hymns...`);

  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  let removedCount = 0;
  for (const h of hymns) {
    if (h.id && (h.id.startsWith('roumi-') || h.id.startsWith('moaqab-'))) {
      delete h.description;
      removedCount++;
    }
  }

  console.log(`✅ Cleared descriptions for ${removedCount} hymns.`);

  // Rebuild unified catalog.json
  const cantorsMap = new Map(cantors.map(c => [c.id, c]));
  const catalog = {
    generatedAt: new Date().toISOString(),
    genres: genresList.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    cantors: cantors.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    hymns: hymns.map(h => {
      const hymnRecordings = recordings
        .filter(r => r.hymnId === h.id && r.active !== false)
        .map(r => ({
          ...r,
          cantor: cantorsMap.get(r.cantorId) || undefined,
        }));

      return {
        ...h,
        recordings: hymnRecordings,
      };
    }).sort((a, b) => a.name.localeCompare(b.name)),
  };

  // Write to all target locations (Web & Mobile)
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'hymns.json'), JSON.stringify(hymns, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced catalog files to: ${dir}`);
    }
  }

  // Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 ALL ROUMI & MO\'AQAB DESCRIPTIONS REMOVED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal error removing descriptions:', err);
  process.exit(1);
});
