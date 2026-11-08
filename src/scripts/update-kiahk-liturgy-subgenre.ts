import * as fs from 'fs';
import * as path from 'path';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';

async function main() {
  console.log('🔄 Reorganizing Kiahk Liturgy subgenre...');

  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const genresPath = path.join(dataDir, 'genres.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));

  const targetHymnIds = [
    'je-efesmaroout-kiahk-weekdays',
    'ti-parthenos-kiahk-weekdays',
    'je-efesmaroout-kiahk-weekends',
    'ef-emepsha-ghar-kiahk-weekends',
  ];

  // 1. Update subGenreId to "Liturgy" in hymns.json
  for (const hid of targetHymnIds) {
    const hymn = hymns.find(h => h.id === hid);
    if (hymn) {
      hymn.subGenreId = { ...hymn.subGenreId, kiahk: 'Liturgy' };
      console.log(`✅ Set subGenreId for ${hid} to Liturgy`);
    } else {
      console.warn(`⚠️ Hymn ${hid} not found in hymns.json`);
    }
  }

  // 2. Update kiahk genre content string in genres.json
  const kiahk = genresList.find(g => g.id === 'kiahk');
  if (kiahk) {
    const oldSection = `subGenre:Liturgy\npsalm-150-kiahk\nsubGenre:Distribution\nje-efesmaroout-kiahk-weekdays\nti-parthenos-kiahk-weekdays\nje-efesmaroout-kiahk-weekends\nef-emepsha-ghar-kiahk-weekends`;
    const newSection = `subGenre:Liturgy\npsalm-150-kiahk\nje-efesmaroout-kiahk-weekdays\nti-parthenos-kiahk-weekdays\nje-efesmaroout-kiahk-weekends\nef-emepsha-ghar-kiahk-weekends`;

    if (kiahk.content.includes(oldSection)) {
      kiahk.content = kiahk.content.replace(oldSection, newSection);
      console.log('✅ Replaced Distribution subgenre with clean Liturgy list.');
    } else {
      // Fallback: strip subGenre:Distribution and ensure order
      kiahk.content = kiahk.content.replace('subGenre:Distribution\n', '');
      console.log('✅ Removed subGenre:Distribution header.');
    }
  }

  // 3. Rebuild catalog.json
  console.log('\n📦 Rebuilding unified catalog.json...');
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

  // 4. Sync across Web and Mobile
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'hymns.json'), JSON.stringify(hymns, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'genres.json'), JSON.stringify(genresList, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced catalog and data files to: ${dir}`);
    }
  }

  // 5. Upload live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 Successfully reorganized hymns under Kiahk Liturgy subgenre!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
