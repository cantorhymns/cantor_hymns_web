---
name: cantor-agent
description: >-
  End-to-end Coptic hymn ingestion, audio processing, lyrics fetching, marker alignment,
  and Firebase publishing agent for CantorHymns. Use this skill whenever the user asks to
  find, download, trim, fetch lyrics for, place markers on, or publish a hymn by a Coptic Cantor.
---

# CantorAgent Skill

CantorAgent automates the 6-step workflow for adding Coptic hymns to CantorHymns:

## Step 1: Multi-Source Audio Search & Download (`youtube.com`, `soundcloud.com`, `tasbeha.org`)
- Searches in both English and Arabic across one or more Cantors (`cantor-bola`, `cantor-gad`, `cantor-ibrahim`, `cantor-tharwat`, or `all`).
- Strictly filters for **pure solo hymn reference recordings**:
  - Rejects classroom/lesson lectures (`حصة`, `محاضرة`, `درس`, `مراجعة`).
  - One person chanting only (rejects choir/deacons/`خورس`/`شمامسة`/`ني أنجيلوس`/`الإكليريكية` and duets).
  - No live liturgy or concert recordings (rejects `قداس`, `حفلة`, `سهرة`, `live`).
  - No musical instruments (rejects `عود`, `ناي`, `توزيع موسيقي`, `cymbals`, etc.).
  - Uses cross-track duration fingerprinting to catch unlabeled third-party re-uploads of choir/live tracks.
- Script: [search_and_download.py](./scripts/search_and_download.py)

```bash
python3 .agents/skills/cantor-agent/scripts/search_and_download.py search \
  --hymn "Tenen" \
  --cantor "cantor-bola,cantor-gad,cantor-ibrahim,cantor-tharwat" \
  --json-out "staging/tenen_search.json"
```

---

## Step 1b: Archival Audio Preservation & Restoration Rules
- **DEFAULT PREFERENCE: Unaltered Originals**: Keep recordings in their natural state. Do **NOT** apply DSP, reverb, echo, EQ, or high-frequency lifting filters unless explicitly requested and approved by the user.
- **Cassette Remastering Constraint**: Run `--inspect-only` first to check if a track has severe high-frequency rolloff (`>= 15 dB` drop between `500 Hz` and `3500 Hz`), and **ask the user** before applying `cassette-remaster`.
- Script: [enhance_audio.py](./scripts/enhance_audio.py)

```bash
# 1. Diagnose if track is an old archival cassette recording
python3 .agents/skills/cantor-agent/scripts/enhance_audio.py \
  --input "staging/tracks/cantor-gad/cantor-gad_tenen_raw.mp3" \
  --inspect-only

# 2. Only if approved / needed for an old archival recording:
python3 .agents/skills/cantor-agent/scripts/enhance_audio.py \
  --input "staging/tracks/cantor-gad/cantor-gad_tenen_raw.mp3" \
  --output "staging/tracks/cantor-gad/cantor-gad_tenen_enhanced.mp3" \
  --preset cassette-remaster
```

---

## Step 2: Smart Audio Boundary & Preface Trimming
- Combines waveform envelope analysis ([trim_audio.py](./scripts/trim_audio.py)) with multimodal audio listening (`view_file` on extracted opening/closing clips):
  1. Run `trim_audio.py analyze` to locate exact vocal onset/offset and opening/closing pauses.
  2. **Cassette Spoken Announcement Removal**: Archival cassettes often open with spoken Arabic announcements (e.g., *"الرومي الأول: يقال بعد..."* from `0.0s` to `~3s`), followed by a silence gap before chanting starts. Identify the announcement boundary and cut it completely.
  3. **Pre-roll Rule**: Always leave **`0.5s`** of natural quiet lead-in before the initial vocal onset (e.g. if vocal onset is at `4.46s`, trim start is `3.96s`) with a smooth micro-fade (`afade=t=in:ss=0:d=0.15`).
  4. **Outro Boundary Rule**: Cut cleanly in the breath gap immediately after the final verse/cadence before any subsequent hymn/doxology begins.
  5. Run `trim_audio.py trim` to export the clean track with smooth micro-fades.

```bash
python3 .agents/skills/cantor-agent/scripts/trim_audio.py analyze \
  --input "staging/tracks/cantor-gad/cantor-gad_tenen_enhanced.mp3"

python3 .agents/skills/cantor-agent/scripts/trim_audio.py trim \
  --input "staging/tracks/cantor-gad/cantor-gad_tenen_enhanced.mp3" \
  --output "staging/tracks/cantor-gad/cantor-gad_tenen.mp3" \
  --start 0.60 --end 1252.90
```

---

## Step 3: Lyrics Fetching & Formatting (`tasbeha.org`)
- Searches `tasbeha.org/hymn_library/search?q=<query>` and parses the structured `<div class="sync-para">` DOM from `tasbeha.org/hymn_library/view/<id>`.
- Extracts **Coptic (Unicode UTF-8)**, **English**, and **Arabic** lyrics (plus Coptic phonetic transliteration in `<hymnId>_lyrics_metadata.json`), fixes known source typos (e.g. `"قدوس اببه"` -> `"قدوس الله"`), and writes stanza-aligned Markdown files matching `LyricsDisplay` in [hymn-player.tsx](../../../src/components/hymn-player.tsx):
  - `staging/lyrics/coptic/<hymnId>_coptic.md`
  - `staging/lyrics/english/<hymnId>_english.md`
  - `staging/lyrics/arabic/<hymnId>_arabic.md`
- **Crosses Rule**: Automatically strip leading crosses (`+ `) from even/alternating verses so all stanzas appear as clean text without choir markers.
- Script: [fetch_lyrics.py](./scripts/fetch_lyrics.py)

```bash
# 1. Search Tasbeha.org Hymn Library for a hymn's view_id
python3 .agents/skills/cantor-agent/scripts/fetch_lyrics.py search --query "Tenen"

# 2. Fetch and generate the 3 Markdown files
python3 .agents/skills/cantor-agent/scripts/fetch_lyrics.py fetch \
  --hymn-id "tenen" \
  --view-id 154 \
  --max-stanzas 3 --strip-parens \
  --out-dir "staging/lyrics"
```

---

## Step 4 & Step 6: Pedagogical Marker Detection & Lyrics-to-Marker Connection
- Uses `25ms` RMS envelope valley detection + Dynamic Programming ([detect_markers.py](./scripts/detect_markers.py)) to place learning markers at natural breath pauses (`~8–22s` sections, averaging `~11–14s`, matching existing CantorHymns recordings).
- Each marker is positioned in the quiet breath pause `~75ms` before the next vocal phrase onset so looping a section in Learn Mode never clips the preceding note or misses the attack.
- **Marker Rules**:
  - **No `0.00` in markers array**: The audio player internally prepends `0` for Section 1 (`const marksForLooping = [0, ...sortedActiveMarks]`). For an $N$-verse hymn, markers must contain exactly $N-1$ timestamps (Marker 1 = Verse 2, Marker 2 = Verse 3, etc.).
  - **Doxologies & Melisma-less Hymns**: Markers are placed strictly on verse boundaries (no sub-verse melisma breakdowns).
  - **Recitative Stanzas & The 4th-Line Pause Trap**:
    - In Coptic doxologies and recitative hymns (e.g., Roumi, Mo'aqab), the 4th line of a stanza often has an internal breathing pause or melodic slowdown before the cadence word (e.g., Verse 1 line 4 *"ymnoumen se"* ... pause ... *"adikhostasia"*).
    - **Never guess or randomly nudge markers**: Simple RMS valley finders will pick that internal pause, placing the marker 2 to 3 seconds too early and catching the final line/word of the previous verse.
    - **Whisper / Phonetic Verification**: Always transcribe the boundary region (using Whisper word timestamps or waveform phoneme inspection) to identify the true end of the previous stanza and the onset of the new stanza's first word. Place the marker in the silence `50–100ms` before the new stanza's vocal attack.
  - **Inline Storage First**: Markers (`markers: number[]`) and Lyrics Mappings (`lyricsMapping: number[]`) are stored directly on the recording document in Cloud Firestore and embedded inline in `catalog.json`.
  - **`lyrics_markers.txt` Format**: A newline-separated list of integers (`0\n1\n2...`). Each line $i$ maps Verse $i$ (1-based) to its section index (`0` for track start, `1` for Marker 1, `2` for Marker 2, etc.).
  - **Dynamic Learn Mode**: The green indicator dot, playback controls, and section looping activate automatically based on the presence of markers (`markers.length > 0`).
  - **User Marker Feedback Terminology**:
    - *"Started earlier"*: The section started **earlier than intended** (meaning trailing syllables / previous verse audio are heard before this section) $\rightarrow$ **DELAY the marker** (increase timestamp).
    - *"Started later"*: The section started **later than intended** (meaning the first syllable / onset was cut off or late) $\rightarrow$ **ADVANCE the marker** (decrease timestamp).
- Supports `--anchor-times` (verified via `top-pauses` + audio listening with `view_file`) so stanza boundaries have exact markers and automatically generates `<cantorId>_<hymnId>_lyrics_markers.txt` (Step 6, mapping each stanza to `0` or its 1-based marker index).

```bash
# 1. Inspect deepest breath pauses around stanza transitions
python3 .agents/skills/cantor-agent/scripts/detect_markers.py top-pauses \
  --input "staging/tracks/cantor-gad/cantor-gad_tenen.mp3" \
  --start 530 --end 720 --limit 15

# 2. Generate _markers.txt (Step 4) and _lyrics_markers.txt (Step 6)
python3 .agents/skills/cantor-agent/scripts/detect_markers.py generate \
  --input "staging/tracks/cantor-gad/cantor-gad_tenen.mp3" \
  --output-markers "staging/markers/cantor-gad/cantor-gad_tenen_markers.txt" \
  --output-lyrics-markers "staging/markers/cantor-gad/cantor-gad_tenen_lyrics_markers.txt" \
  --anchor-times "562.275,1173.225" \
  --min-gap 8.0 --target-gap 14.5 --max-gap 26.0
```

---

## Step 5: Cloud Firestore, Storage & Static CDN Catalog Publishing

CantorAgent is responsible for maintaining all application data (lyrics, hymns, genres, recordings, and markers). The architecture uses a two-tier database system:
1. **Cloud Firestore (Live Source of Truth for Admin Portal)**:
   - Queried directly by the Admin Portal at `/admin/seasons`, `/admin/hymns`, and `/admin/cantors`.
   - Every hymn (`hymns/{hymnId}`), recording (`recordings/{cantorId}_{hymnId}`), and season (`genres/{genreId}`) must exist in Firestore so admins can view, edit, and rank them.
   - Always authenticate writes using `signInAnonymously(auth)` from Firebase Auth.
2. **Static Edge CDN (`data/catalog.json` in Firebase Storage)**:
   - High-performance, zero-latency CDN edge cache serving both Web and Mobile apps.
   - All hymns, recordings, markers, and inlined lyrics are bundled together for instant offline/online playback.
3. **4-Way Local Directory Mirroring**:
   - Any data update must always sync across all 4 locations:
     - `src/data/` (Web source & components)
     - `data/` (Backend scripts source)
     - `public/data/` (Web static asset serving)
     - `../cantor_hymns_mobile/src/data/` (Mobile app offline bundle)

---

### Standard Data Update Operations

#### 1. Ingesting & Publishing a New Hymn & Recording
Use the unified publishing script [`publish-hymn.ts`](../../../src/scripts/publish-hymn.ts):
```bash
npx tsx src/scripts/publish-hymn.ts \
  --hymn-id "tenen" \
  --name "Tenen" \
  --genres "kiahk" \
  --subgenre "Midnight Praises" \
  --cantor "cantor-gad" \
  --audio-file "staging/tracks/cantor-gad/cantor-gad_tenen.mp3" \
  --audio-length 1252.3 \
  --markers-file "staging/markers/cantor-gad/cantor-gad_tenen_markers.txt" \
  --lyrics-mapping-file "staging/markers/cantor-gad/cantor-gad_tenen_lyrics_markers.txt" \
  --description "Psali Watos for the Three Saintly Children..." \
  --mode "learn"
```
*This script automatically:*
- Uploads audio track and marker text files to Firebase Storage.
- Reads and inlines lyrics from `staging/lyrics/{coptic,english,arabic}/<hymnId>_*.md`.
- Inlines `markers: number[]` and `lyricsMapping: number[]` directly into the recording.
- Inserts `<hymnId>` under the specified `subGenre:<Name>` in `genre.content` (Zero "Other" Hymns Rule).
- Updates documents in Cloud Firestore (`hymns`, `recordings`, `genres`).
- Syncs `hymns.json`, `recordings.json`, `genres.json`, and `catalog.json` across all 4 directories.
- Pushes the live `catalog.json` to Firebase Storage CDN.

#### 2. Updating Lyrics for an Existing Hymn
Use [`update-lyrics.ts`](../../../src/scripts/update-lyrics.ts) whenever correcting or re-fetching lyrics:
```bash
npx tsx src/scripts/update-lyrics.ts \
  --hymn-id "tenen" \
  --coptic-file "staging/lyrics/coptic/tenen_coptic.md" \
  --english-file "staging/lyrics/english/tenen_english.md" \
  --arabic-file "staging/lyrics/arabic/tenen_arabic.md"
```
*Updates Firestore, updates `hymns.json`, rebuilds `catalog.json`, syncs all 4 directories, and deploys to CDN.*

#### 3. Updating Learning Markers or Lyrics Mapping
Use [`update-markers.ts`](../../../src/scripts/update-markers.ts) whenever nudging timestamps or adjusting verse mappings:
```bash
npx tsx src/scripts/update-markers.ts \
  --cantor "cantor-gad" \
  --hymn-id "tenen" \
  --markers-file "staging/markers/cantor-gad/cantor-gad_tenen_markers.txt" \
  --lyrics-mapping-file "staging/markers/cantor-gad/cantor-gad_tenen_lyrics_markers.txt"
```
*Updates Firestore, updates `recordings.json`, rebuilds `catalog.json`, syncs all 4 directories, and deploys to CDN.*

#### 4. Manually Compiling & Pushing the Edge CDN Snapshot
To re-push the live catalog snapshot to Firebase Storage CDN at any time:
```bash
npm run catalog:push
```

---

### Critical Data Integrity Rules

1. **Zero "Other" Hymns Rule**:
   - Every hymn assigned to a `genreId` MUST be explicitly listed under that genre's `content` string under a `subGenre:<Subgenre Name>` heading.
   - Never leave hymns unassigned in `genres.json` or `catalog.json`; unassigned hymns will drop into "Other Hymns".
2. **Preserve Liturgical Season Ranks (Kiahk is #1)**:
   - All `genres.json` files have explicit `rank` values:
     - `#1: Kiahk`
     - `#2: Nativity`
     - `#3: Lent`
     - `#4: Lazarus Saturday`
     - `#5: Holy Week`
     - `#6: Resurrection`
     - `#7: Apostles' Fast`
   - **Never overwrite `rank` with `undefined` or default to 99**. When sorting genres, sort strictly by `(a.rank ?? 99) - (b.rank ?? 99)`. Never sort genres alphabetically with `localeCompare` without rank checks, as that will improperly push "Apostles' Fast" to the top.
3. **Naming & Sequential Verses**:
   - For sequential liturgical series (e.g., Roumi 1–9, Mo'aqab 1–9): Titles must remain clean and strictly numbered (`"Roumi 1"`, `"Mo'aqab 1"`). Do not append lyrics or Arabic names to the title.
   - Omit descriptions for sequential liturgical verses unless specifically instructed.
4. **Preserve Other Seasons & Hymns**:
   - Never replace or truncate `genres.json` or `catalog.json` with a single-season object. Any script modifying data must merge into the complete 7-season, 70-hymn library.



