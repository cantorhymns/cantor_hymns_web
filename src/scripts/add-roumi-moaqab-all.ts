import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase/config';
import { uploadCatalogToStorage } from './upload-catalog-to-storage';
import * as fs from 'fs';
import * as path from 'path';

interface HymnDef {
  id: string;
  name: string;
  description: string;
  audioLength: number;
}

const hymnsList: HymnDef[] = [
  {
    id: 'roumi-1',
    name: 'Roumi 1 - Sinthoksastomen',
    description: 'The 1st Roumi (Sinthoksastomen / Ⲥⲩⲛⲇⲟⲝⲁⲥⲑⲱⲙⲉⲛ), chanted after the 1st part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 173.9,
  },
  {
    id: 'moaqab-1',
    name: 'Mo\'aqab 1 - Aina-hos Nak',
    description: 'The 1st Mo\'aqab (Aina-hos Nak / Ⲁⲓⲛⲁϩⲱⲥ ⲛⲁⲕ), chanted after the 1st Roumi in Kiahk Vespers Praises.',
    audioLength: 217.9,
  },
  {
    id: 'roumi-2',
    name: 'Roumi 2 - Ephnouti Ou-orp',
    description: 'The 2nd Roumi (Ephnouti Ou-orp / ⲀⲪϯ ⲟⲩⲱⲣⲡ), chanted after the 2nd part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 158.2,
  },
  {
    id: 'moaqab-2',
    name: 'Mo\'aqab 2 - Vorp Neeyi',
    description: 'The 2nd Mo\'aqab (Vorp Neeyi / Ⲃⲱⲣⲡ ⲛⲏⲓ), chanted after the 2nd Roumi in Kiahk Vespers Praises.',
    audioLength: 224.7,
  },
  {
    id: 'roumi-3',
    name: 'Roumi 3 - Rama Ephnouti',
    description: 'The 3rd Roumi (Rama Ephnouti / Ⲣⲁⲙⲁ Ⲫ̀ϯ), chanted after the 3rd part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 151.3,
  },
  {
    id: 'moaqab-3',
    name: 'Mo\'aqab 3 - Je Ghar Enthok',
    description: 'The 3rd Mo\'aqab (Je Ghar Enthok / Ⲅⲉ ⲅⲁⲣ ⲛ̀ⲑⲟⲕ), chanted after the 3rd Roumi in Kiahk Vespers Praises.',
    audioLength: 155.8,
  },
  {
    id: 'roumi-4',
    name: 'Roumi 4 - Kyrie Tis Omios',
    description: 'The 4th Roumi (Kyrie Tis Omios / Ⲕⲩⲣⲓⲉ ⲧⲓⲥ ⲟ̀ⲙⲓⲟⲥ), chanted after the 4th part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 152.6,
  },
  {
    id: 'moaqab-4',
    name: 'Mo\'aqab 4 - Despota Pi-Ref-Erhemi',
    description: 'The 4th Mo\'aqab (Despota Pi-Ref-Erhemi / Ⲇⲉⲥⲡⲟⲧⲁ ⲠⲓⲢⲉϥⲉⲣϩⲉⲙⲓ), chanted after the 4th Roumi in Kiahk Vespers Praises.',
    audioLength: 160.4,
  },
  {
    id: 'roumi-5',
    name: 'Roumi 5 - Is Heepe Pchois',
    description: 'The 5th Roumi (Is Heepe Pchois / Ⲓⲥ ϩⲏⲡⲡⲉ Ⲡⲟ̅ⲥ̅), chanted after the 5th part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 159.0,
  },
  {
    id: 'moaqab-5',
    name: 'Mo\'aqab 5 - Ethve Pekran Pchois',
    description: 'The 5th Mo\'aqab (Ethve Pekran Pchois / Ⲉⲑⲃⲉ ⲡⲉⲕⲣⲁⲛ Ⲡ̀ⲟ̅ⲥ̅), chanted after the 5th Roumi in Kiahk Vespers Praises.',
    audioLength: 171.6,
  },
  {
    id: 'roumi-6',
    name: 'Roumi 6 - Soms Owoh Mai-aten Theenou',
    description: 'The 6th Roumi (Soms Owoh Mai-aten Theenou / Ⲥⲟⲙⲥ ⲟⲩⲟϩ ⲙⲁⲓⲁ̀ⲧⲉⲛ ⲑⲏⲛⲟⲩ), chanted after the 6th part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 152.5,
  },
  {
    id: 'moaqab-6',
    name: 'Mo\'aqab 6 - Ze-osh Enje Na-paraptoma',
    description: 'The 6th Mo\'aqab (Ze-osh Enje Na-paraptoma / Ⲍⲉⲟϣ ⲛ̀ϫⲉ ⲛⲁⲡⲁⲣⲁⲡ̀ⲧⲱⲙⲁ), chanted after the 6th Roumi in Kiahk Vespers Praises.',
    audioLength: 167.9,
  },
  {
    id: 'roumi-7',
    name: 'Roumi 7 - Ari-ksate Nemee Emfo-ou',
    description: 'The 7th Roumi (Ari-ksate Nemee Emfo-ou / Ⲁⲣⲓⲝⲁⲧⲉ ⲛⲉⲙⲏⲓ ⲙ̀ⲫⲟⲟⲩ), chanted after the 7th part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 144.6,
  },
  {
    id: 'moaqab-7',
    name: 'Mo\'aqab 7 - Eedeos Niven Ente Ni-novi',
    description: 'The 7th Mo\'aqab (Eedeos Niven Ente Ni-novi / Ⲏ̀ⲇⲉⲟⲥ ⲛⲓⲃⲉⲛ ⲛ̀ⲧⲉ ⲛⲓⲛⲟⲃⲓ), chanted after the 7th Roumi in Kiahk Vespers Praises.',
    audioLength: 170.8,
  },
  {
    id: 'roumi-8',
    name: 'Roumi 8 - Kalos Iden Se Iakob',
    description: 'The 8th Roumi (Kalos Iden Se Iakob / Ⲕⲁⲗⲱⲥ ⲓ̀ⲇⲉⲛ ⲥⲉ Ⲓⲁⲕⲱⲃ), chanted after the 8th part of the Saturday Theotokia (Aretin-thonti) in Kiahk Vespers Praises.',
    audioLength: 145.5,
  },
  {
    id: 'moaqab-8',
    name: 'Mo\'aqab 8 - Theos Emperkhat Ensok',
    description: 'The 8th Mo\'aqab (Theos Emperkhat Ensok / Ⲑⲉⲟⲥ ⲙ̀ⲡⲉⲣⲭⲁⲧ ⲛ̀ⲥⲱⲕ), chanted after the 8th Roumi in Kiahk Vespers Praises.',
    audioLength: 182.2,
  },
  {
    id: 'roumi-9',
    name: 'Roumi 9 - Is Anatolee Ke Dysis',
    description: 'The 9th Roumi (Is Anatolee Ke Dysis / Ⲓⲥ ⲁ̀ⲛⲁⲧⲟⲗⲏ ⲕⲉ ⲇⲩ̀ⲥⲓⲥ), chanted after the 9th part of the Saturday Theotokia in Kiahk Vespers Praises.',
    audioLength: 146.8,
  },
  {
    id: 'moaqab-9',
    name: 'Mo\'aqab 9 - Iisous Pi-Khristos Pa-voithos',
    description: 'The 9th Mo\'aqab (Iisous Pi-Khristos Pa-voithos / Ⲓⲏ̅ⲥ̅ Ⲡⲭ̅ⲥ̅ ⲡⲁⲃⲟⲓ̀ⲑⲟⲥ), chanted after the 9th Roumi in Kiahk Vespers Praises.',
    audioLength: 151.0,
  },
];

const cantorId = 'cantor-tharwat';

async function main() {
  console.log(`\n🚀 Ingesting 18 Roumi & Mo'aqab hymns for Cantor Tharwat...`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log('Authenticating anonymously to Firebase Storage...');
  await signInAnonymously(auth);
  console.log('✅ Authenticated successfully.');

  // 1. Upload audio tracks and lyrics to Firebase Storage
  console.log('\n📤 Uploading audio tracks and lyrics markdown files to Firebase Storage...');
  for (const h of hymnsList) {
    const recordingId = `${cantorId}_${h.id}`;
    const mp3Local = `staging/tracks/cantor-tharwat/${recordingId}.mp3`;
    const mp3Storage = `tracks/${cantorId}/${recordingId}.mp3`;

    if (fs.existsSync(mp3Local)) {
      console.log(`Uploading track: ${mp3Storage}...`);
      const buffer = fs.readFileSync(mp3Local);
      await uploadBytes(ref(storage, mp3Storage), buffer, { contentType: 'audio/mpeg' });
    } else {
      console.warn(`⚠️ Warning: local file ${mp3Local} not found!`);
    }

    const lyricsTypes = ['coptic', 'english', 'arabic'];
    for (const lt of lyricsTypes) {
      const lLocal = `staging/lyrics/${lt}/${h.id}_${lt}.md`;
      const lStorage = `lyrics/${lt}/${h.id}_${lt}.md`;
      if (fs.existsSync(lLocal)) {
        const lBuf = fs.readFileSync(lLocal);
        await uploadBytes(ref(storage, lStorage), lBuf, { contentType: 'text/markdown; charset=utf-8' });
      }
    }
    console.log(`✅ Uploaded assets for ${h.id}`);
  }

  // 2. Update kiahk_content.txt in Firebase Storage
  console.log('\n🔄 Updating kiahk_content.txt in Firebase Storage...');
  try {
    const contentRef = ref(storage, 'genres/content/kiahk_content.txt');
    const existingBytes = await getBytes(contentRef);
    let contentText = Buffer.from(existingBytes).toString('utf-8');

    // Build the ordered hymn block
    const hymnBlock = hymnsList.map(h => h.id).join('\n');

    // Check if hymns already present
    if (!contentText.includes('roumi-1')) {
      if (contentText.includes('aretenthonti-kiahk\n')) {
        contentText = contentText.replace(
          'aretenthonti-kiahk\n',
          `aretenthonti-kiahk\n${hymnBlock}\n`
        );
      } else if (contentText.includes('subGenre:Vespers Praises\n')) {
        contentText = contentText.replace(
          'subGenre:Vespers Praises\n',
          `subGenre:Vespers Praises\n${hymnBlock}\n`
        );
      } else {
        contentText = `subGenre:Vespers Praises\n${hymnBlock}\n` + contentText;
      }

      await uploadBytes(contentRef, Buffer.from(contentText, 'utf-8'), {
        contentType: 'text/plain; charset=utf-8',
      });
      console.log('✅ Successfully updated kiahk_content.txt with all 18 hymns.');
    } else {
      console.log('ℹ️ kiahk_content.txt already contains Roumi and Mo\'aqab.');
    }
  } catch (err) {
    console.warn('⚠️ Could not update kiahk_content.txt in Storage:', err);
  }

  // 3. Load local database files
  const dataDir = path.resolve(process.cwd(), 'src/data');
  const hymnsPath = path.join(dataDir, 'hymns.json');
  const recordingsPath = path.join(dataDir, 'recordings.json');
  const cantorsPath = path.join(dataDir, 'cantors.json');
  const genresPath = path.join(dataDir, 'genres.json');

  const hymns: any[] = JSON.parse(fs.readFileSync(hymnsPath, 'utf-8'));
  const recordings: any[] = JSON.parse(fs.readFileSync(recordingsPath, 'utf-8'));
  const cantors: any[] = JSON.parse(fs.readFileSync(cantorsPath, 'utf-8'));
  const genresList: any[] = JSON.parse(fs.readFileSync(genresPath, 'utf-8'));

  // 4. Update hymns and recordings
  for (const h of hymnsList) {
    const recordingId = `${cantorId}_${h.id}`;

    // Read lyrics text to embed inline
    const copticText = fs.existsSync(`staging/lyrics/coptic/${h.id}_coptic.md`)
      ? fs.readFileSync(`staging/lyrics/coptic/${h.id}_coptic.md`, 'utf-8').trim()
      : '';
    const englishText = fs.existsSync(`staging/lyrics/english/${h.id}_english.md`)
      ? fs.readFileSync(`staging/lyrics/english/${h.id}_english.md`, 'utf-8').trim()
      : '';
    const arabicText = fs.existsSync(`staging/lyrics/arabic/${h.id}_arabic.md`)
      ? fs.readFileSync(`staging/lyrics/arabic/${h.id}_arabic.md`, 'utf-8').trim()
      : '';

    const hymnRecord: any = {
      id: h.id,
      name: h.name,
      genreId: ['kiahk'],
      subGenreId: {
        kiahk: 'Vespers Praises',
      },
      description: h.description,
      lyricsEnglish: `lyrics/english/${h.id}_english.md`,
      lyricsCoptic: `lyrics/coptic/${h.id}_coptic.md`,
      lyricsArabic: `lyrics/arabic/${h.id}_arabic.md`,
      lyrics: {
        coptic: copticText,
        english: englishText,
        arabic: arabicText,
      },
    };

    const exHymnIdx = hymns.findIndex(x => x.id === h.id);
    if (exHymnIdx >= 0) {
      hymns[exHymnIdx] = { ...hymns[exHymnIdx], ...hymnRecord };
    } else {
      hymns.push(hymnRecord);
    }

    const recordingRecord = {
      id: recordingId,
      hymnId: h.id,
      cantorId,
      audioUrl: `tracks/${cantorId}/${recordingId}.mp3`,
      markersUrl: `markers/${cantorId}/${recordingId}_markers.txt`,
      lyricsMappingUrl: `markers/${cantorId}/${recordingId}_lyrics_markers.txt`,
      audioLength: h.audioLength,
      markers: [],
      lyricsMapping: [],
      active: true,
      mode: 'learn' as const,
    };

    const exRecIdx = recordings.findIndex(r => r.id === recordingId);
    if (exRecIdx >= 0) {
      recordings[exRecIdx] = { ...recordings[exRecIdx], ...recordingRecord };
    } else {
      recordings.push(recordingRecord);
    }
  }

  // 5. Update kiahk genre content string in genresList
  const kiahkGenre = genresList.find(g => g.id === 'kiahk');
  if (kiahkGenre) {
    const hymnBlock = hymnsList.map(h => h.id).join('\n');
    let c = kiahkGenre.content || '';
    if (!c.includes('roumi-1')) {
      if (c.includes('aretenthonti-kiahk\n')) {
        kiahkGenre.content = c.replace('aretenthonti-kiahk\n', `aretenthonti-kiahk\n${hymnBlock}\n`);
      } else if (c.includes('subGenre:Vespers Praises\n')) {
        kiahkGenre.content = c.replace('subGenre:Vespers Praises\n', `subGenre:Vespers Praises\n${hymnBlock}\n`);
      } else {
        kiahkGenre.content = `subGenre:Vespers Praises\n${hymnBlock}\n` + c;
      }
    }
  }

  // 6. Rebuild unified catalog.json
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

  // 7. Write to all target locations (Web & Mobile)
  const targetDirs = [
    dataDir,
    path.resolve(process.cwd(), 'public/data'),
    path.resolve(process.cwd(), '../cantor_hymns_mobile/src/data'),
  ];

  for (const dir of targetDirs) {
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'hymns.json'), JSON.stringify(hymns, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'recordings.json'), JSON.stringify(recordings, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'genres.json'), JSON.stringify(genresList, null, 2), 'utf-8');
      fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`✅ Synced catalog files to: ${dir}`);
    }
  }

  // 8. Push live catalog.json to Firebase Storage CDN
  console.log('\n☁️ Uploading live catalog.json to Firebase Storage CDN...');
  await uploadCatalogToStorage();
  console.log('✅ Catalog is live on Firebase Storage CDN!');

  console.log('\n🎉 ALL 18 ROUMI & MO\'AQAB HYMNS PUBLISHED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Fatal error publishing hymns:', err);
  process.exit(1);
});
