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

## Step 1b: Optional Archival Audio Restoration (Only for Old/Cassette Recordings)
- **IMPORTANT RULE:** Do **NOT** apply `cassette-remaster` to all recordings! Modern, clean recordings should be kept in their natural state.
- Run `--inspect-only` first to check if a track has severe high-frequency rolloff (`>= 15 dB` drop between `500 Hz` and `3500 Hz`), and **ask the user** before applying `cassette-remaster`.
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
  2. Extract the first 25s and last 20s and listen with `view_file` to verify whether any opening segment is a spoken commentary/preface or the first chanted word of the hymn.
  3. Run `trim_audio.py trim` to remove spoken prefaces/outros and leading/trailing dead air with smooth micro-fades.

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

## Step 5: Firebase Storage & Static JSON Catalog Publishing
- Uploads all media files to their canonical paths in Firebase Storage:
  - `tracks/<cantorId>/<cantorId>_<hymnId>.mp3`
  - `markers/<cantorId>/<cantorId>_<hymnId>_markers.txt`
  - `markers/<cantorId>/<cantorId>_<hymnId>_lyrics_markers.txt`
  - `lyrics/coptic/<hymnId>_coptic.md`
  - `lyrics/english/<hymnId>_english.md`
  - `lyrics/arabic/<hymnId>_arabic.md`
- Registers the hymn and recording into the JSON catalog across both web (`src/data`, `public/data`) and mobile (`cantor_hymns_mobile/src/data`):
  - Script: `src/scripts/publish-hymn.ts`
  ```bash
  npx tsx src/scripts/publish-hymn.ts \
    --hymn-id "tenen" \
    --name "Tenen" \
    --genres "kiahk" \
    --cantor "cantor-gad" \
    --mode "learn" \
    --description "Psali Watos for the Three Saintly Children..."
  ```



