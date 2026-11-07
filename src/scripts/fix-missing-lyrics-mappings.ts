import * as fs from 'fs';
import * as path from 'path';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';

async function main() {
  console.log('🔄 Auditing and updating lyrics mappings in catalog...');

  const srcDataDir = path.resolve(process.cwd(), 'src/data');
  const recordingsPath = path.join(srcDataDir, 'recordings.json');
  const hymnsPath = path.join(srcDataDir, 'hymns.json');
  const cantorsPath = path.join(srcDataDir, 'cantors.json');
  const genresPath = path.join(srcDataDir, 'genres.json');

  const recordings = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const hymns = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const cantors = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genres = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  // Known verified recordings with lyrics markers files in Firebase Storage
  const knownVerifiedLyricsMarkers: Record<string, string> = {
    'cantor-ibrahim_psalm-150-kiahk': 'markers/cantor-ibrahim/cantor-ibrahim_psalm-150-kiahk_lyrics_markers.txt',
    'cantor-ibrahim_ke-eperto': 'markers/cantor-ibrahim/cantor-ibrahim_ke-eperto_lyrics_markers.txt',
    'cantor-gad_tenen': 'markers/cantor-gad/cantor-gad_tenen_lyrics_markers.txt',
  };

  let updatedCount = 0;
  for (const r of recordings) {
    if (knownVerifiedLyricsMarkers[r.id] && !r.lyricsMappingUrl) {
      r.lyricsMappingUrl = knownVerifiedLyricsMarkers[r.id];
      console.log(`✅ Added lyricsMappingUrl to recording "${r.id}": ${r.lyricsMappingUrl}`);
      updatedCount++;
    }
  }

  console.log(`\nUpdated ${updatedCount} recording(s).`);

  // Rebuild catalog.json
  const cantorsMap = new Map(cantors.map((c: any) => [c.id, c]));
  const catalog = {
    generatedAt: new Date().toISOString(),
    genres: genres.sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    cantors: cantors.sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999) || a.name.localeCompare(b.name)),
    hymns: hymns.map((h: any) => {
      const hymnRecordings = recordings
        .filter((r: any) => r.hymnId === h.id && r.active !== false)
        .map((r: any) => ({
          ...r,
          cantor: cantorsMap.get(r.cantorId) || undefined,
        }));

      return {
        ...h,
        recordings: hymnRecordings,
      };
    }).sort((a: any, b: any) => a.name.localeCompare(b.name)),
  };

  const targetDirs = [
    srcDataDir,
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    try {
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
        fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
        console.log(`💾 Synced catalog to: ${dir}`);
      }
    } catch (e: any) {
      console.warn(`Could not sync to ${dir}: ${e.message}`);
    }
  }

  // Push to Firebase Storage
  console.log('\n☁️ Pushing updated catalog to Firebase Storage for live sync...');
  const url = await uploadCatalogToStorage();
  console.log('🎉 Done! Public URL:', url);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
