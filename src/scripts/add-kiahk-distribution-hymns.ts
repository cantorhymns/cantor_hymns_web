import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🎵 Staging and publishing Kiahk Distribution hymns and lyrics...');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log('Authenticating anonymously to Firebase Storage...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated.');

  const stagingLyricsDir = path.resolve(process.cwd(), 'staging/lyrics');
  const copticDir = path.join(stagingLyricsDir, 'coptic');
  const englishDir = path.join(stagingLyricsDir, 'english');
  const arabicDir = path.join(stagingLyricsDir, 'arabic');

  for (const d of [copticDir, englishDir, arabicDir]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // 1. Prepare Je Efesmaroout Weekdays & Weekends lyrics files
  const jeEfesCoptic = 'Ϫⲉ ϥ̀ⲥ̀ⲙⲁⲣⲱⲟⲩⲧ ⲛ̀ϫⲉ Ⲫⲓⲱⲧ ⲛⲉⲙ ⲡ̀Ϣⲏⲣⲓ: ⲛⲉⲙ ⲡⲓⲠ̀ⲛⲉⲩⲙⲁ ⲉ̅ⲑ̅ⲩ̅: ϯⲦ̀ⲣⲓⲁⲥ ⲉⲧϫⲏⲕ ⲉ̀ⲃⲟⲗ: ⲧⲉⲛⲟⲩⲱϣⲧ ⲙ̀ⲙⲟⲥ ⲧⲉⲛϯⲱ̀ⲟⲩ ⲛⲁⲥ.';
  const jeEfesEnglish = 'Blessed be the Father and the Son and the Holy Spirit, the perfect Trinity. We worship Him and glorify Him.';
  const jeEfesArabic = 'مبارك الآب والابن والروح القدس، الثالوث الكامل، نسجد له ونمجده.';

  for (const id of ['je-efesmaroout-kiahk-weekdays', 'je-efesmaroout-kiahk-weekends']) {
    fs.writeFileSync(path.join(copticDir, `${id}_coptic.md`), jeEfesCoptic, 'utf-8');
    fs.writeFileSync(path.join(englishDir, `${id}_english.md`), jeEfesEnglish, 'utf-8');
    fs.writeFileSync(path.join(arabicDir, `${id}_arabic.md`), jeEfesArabic, 'utf-8');
  }

  // 2. Prepare Ef-Emepsha Ghar Weekends lyrics files
  const efEmepshaCoptic = fs.readFileSync(path.join(copticDir, 'ef-emepsha-ghar-kiahk_coptic.md'), 'utf-8');
  const efEmepshaEnglish = fs.readFileSync(path.join(englishDir, 'ef-emepsha-ghar-kiahk_english.md'), 'utf-8');
  const efEmepshaArabic = fs.readFileSync(path.join(arabicDir, 'ef-emepsha-ghar-kiahk_arabic.md'), 'utf-8');

  fs.writeFileSync(path.join(copticDir, 'ef-emepsha-ghar-kiahk-weekends_coptic.md'), efEmepshaCoptic, 'utf-8');
  fs.writeFileSync(path.join(englishDir, 'ef-emepsha-ghar-kiahk-weekends_english.md'), efEmepshaEnglish, 'utf-8');
  fs.writeFileSync(path.join(arabicDir, 'ef-emepsha-ghar-kiahk-weekends_arabic.md'), efEmepshaArabic, 'utf-8');

  // Read Ti Parthenos Weekdays lyrics
  const tiParthenosCoptic = fs.readFileSync(path.join(copticDir, 'ti-parthenos-kiahk-weekdays_coptic.md'), 'utf-8');
  const tiParthenosEnglish = fs.readFileSync(path.join(englishDir, 'ti-parthenos-kiahk-weekdays_english.md'), 'utf-8');
  const tiParthenosArabic = fs.readFileSync(path.join(arabicDir, 'ti-parthenos-kiahk-weekdays_arabic.md'), 'utf-8');

  // 3. Define Hymn Objects
  const newHymns = [
    {
      id: 'je-efesmaroout-kiahk-weekdays',
      name: 'Je Efesmaroout (Weekdays)',
      genreId: ['kiahk'],
      subGenreId: { kiahk: 'Distribution' },
      lyricsEnglish: 'lyrics/english/je-efesmaroout-kiahk-weekdays_english.md',
      lyricsCoptic: 'lyrics/coptic/je-efesmaroout-kiahk-weekdays_coptic.md',
      lyricsArabic: 'lyrics/arabic/je-efesmaroout-kiahk-weekdays_arabic.md',
      lyrics: {
        coptic: jeEfesCoptic,
        english: jeEfesEnglish,
        arabic: jeEfesArabic,
      },
    },
    {
      id: 'ti-parthenos-kiahk-weekdays',
      name: 'Ti Parthenos (Weekdays)',
      genreId: ['kiahk'],
      subGenreId: { kiahk: 'Distribution' },
      lyricsEnglish: 'lyrics/english/ti-parthenos-kiahk-weekdays_english.md',
      lyricsCoptic: 'lyrics/coptic/ti-parthenos-kiahk-weekdays_coptic.md',
      lyricsArabic: 'lyrics/arabic/ti-parthenos-kiahk-weekdays_arabic.md',
      lyrics: {
        coptic: tiParthenosCoptic,
        english: tiParthenosEnglish,
        arabic: tiParthenosArabic,
      },
    },
    {
      id: 'je-efesmaroout-kiahk-weekends',
      name: 'Je Efesmaroout (Weekends)',
      genreId: ['kiahk'],
      subGenreId: { kiahk: 'Distribution' },
      lyricsEnglish: 'lyrics/english/je-efesmaroout-kiahk-weekends_english.md',
      lyricsCoptic: 'lyrics/coptic/je-efesmaroout-kiahk-weekends_coptic.md',
      lyricsArabic: 'lyrics/arabic/je-efesmaroout-kiahk-weekends_arabic.md',
      lyrics: {
        coptic: jeEfesCoptic,
        english: jeEfesEnglish,
        arabic: jeEfesArabic,
      },
    },
    {
      id: 'ef-emepsha-ghar-kiahk-weekends',
      name: 'Ef-Emepsha Ghar (Weekends)',
      genreId: ['kiahk'],
      subGenreId: { kiahk: 'Distribution' },
      lyricsEnglish: 'lyrics/english/ef-emepsha-ghar-kiahk-weekends_english.md',
      lyricsCoptic: 'lyrics/coptic/ef-emepsha-ghar-kiahk-weekends_coptic.md',
      lyricsArabic: 'lyrics/arabic/ef-emepsha-ghar-kiahk-weekends_arabic.md',
      lyrics: {
        coptic: efEmepshaCoptic,
        english: efEmepshaEnglish,
        arabic: efEmepshaArabic,
      },
    },
  ];

  // 4. Upload lyrics files to Firebase Storage
  console.log('\n☁️ Uploading lyrics markdown files to Firebase Storage...');
  for (const h of newHymns) {
    for (const [lang, storagePath] of [
      ['coptic', h.lyricsCoptic],
      ['english', h.lyricsEnglish],
      ['arabic', h.lyricsArabic],
    ] as const) {
      const content = h.lyrics[lang];
      await uploadBytes(ref(storage, storagePath), Buffer.from(content, 'utf-8'), {
        contentType: 'text/markdown; charset=utf-8',
      });
      console.log(`  Uploaded ${storagePath}`);
    }
  }

  // 5. Update hymns.json
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  for (const newH of newHymns) {
    const existingIdx = hymns.findIndex(h => h.id === newH.id);
    if (existingIdx >= 0) {
      hymns[existingIdx] = { ...hymns[existingIdx], ...newH };
      console.log(`✅ Updated existing hymn: ${newH.id}`);
    } else {
      hymns.push(newH);
      console.log(`✅ Added new hymn: ${newH.id}`);
    }
  }

  // 6. Update Kiahk genre subgenre layout in genres.json
  const kiahkGenre = genresList.find(g => g.id === 'kiahk');
  if (kiahkGenre) {
    const distributionSection = `subGenre:Distribution\nje-efesmaroout-kiahk-weekdays\nti-parthenos-kiahk-weekdays\nje-efesmaroout-kiahk-weekends\nef-emepsha-ghar-kiahk-weekends`;
    
    // Check if subGenre:Distribution already exists in content
    if (!kiahkGenre.content.includes('subGenre:Distribution')) {
      // Insert after subGenre:Liturgy section
      if (kiahkGenre.content.includes('subGenre:Liturgy\npsalm-150-kiahk')) {
        kiahkGenre.content = kiahkGenre.content.replace(
          'subGenre:Liturgy\npsalm-150-kiahk',
          `subGenre:Liturgy\npsalm-150-kiahk\n${distributionSection}`
        );
      } else {
        kiahkGenre.content = `${distributionSection}\n${kiahkGenre.content}`;
      }
    } else {
      // Ensure all 4 hymns are in the Distribution section
      for (const h of newHymns) {
        if (!kiahkGenre.content.includes(h.id)) {
          kiahkGenre.content = kiahkGenre.content.replace(
            'subGenre:Distribution',
            `subGenre:Distribution\n${h.id}`
          );
        }
      }
    }
    console.log('✅ Updated Kiahk genre subgenre layout with Distribution hymns.');
  }

  // 7. Make sure cantor-zaher is active in cantors.json
  const zaher = cantors.find(c => c.id === 'cantor-zaher');
  if (zaher) {
    zaher.cantorCloudActive = true;
    console.log('✅ Activated Cantor Zaher in cantors.json');
  }

  // 8. Rebuild unified catalog.json
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

  // 9. Write to all target locations (Web & Mobile)
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
      fs.writeFileSync(path.join(dir, 'cantors.json'), JSON.stringify(cantors, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced catalog and data files to: ${dir}`);
    }
  }

  // 10. Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 ALL 4 KIAHK DISTRIBUTION HYMNS & LYRICS ADDED AND PUBLISHED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
