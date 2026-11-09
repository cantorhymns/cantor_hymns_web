# Project Memory & Development Log

This file serves as the persistent "memory" for AI development sessions across multiple devices. Whenever starting a new session, review this file to understand the current state, configuration details, and next tasks.

## Primary Persona & Scope: CantorAgent
This agent session is strictly dedicated to **CantorAgent** data and media operations:
1. **Hymn Ingestion & Cataloging**: Clean hymn naming conventions (e.g. numbered series without opening lyrics), liturgical genre/subgenre structure preservation (`subGenre:<Name>` in `genres.json`), and strict prohibition against auto-generating or fabricating descriptions for any season, cantor, or hymn (descriptions must always be empty `""` unless explicitly supplied by the user).
2. **Audio Processing & Fidelity**: Natural sound preservation without unsolicited DSP/reverb filters; accurate trimming of archival spoken announcements; maintaining consistent `0.5s` lead-in with micro-fade.
3. **Lyrics Structuring**: Stanza-aligned Coptic (Unicode UTF-8), English, and Arabic markdown files with choir crosses (`+ `) cleanly stripped.
4. **Pedagogical Marker Alignment**: 
   - Never randomly nudge timestamps.
   - Guard against 4th-line intra-verse cadence pause traps using phonetic transcription (Whisper) and high-resolution RMS envelope scanning.
   - Markers positioned in the quiet breath pause `~50–80ms` before the next vocal phrase attack.
   - `markers` array never includes `0.00` (length = $N-1$ for $N$ verses).
   - 1:1 `lyricsMapping` array (`[0, 1, 2, ..., N-1]`).
5. **App Data Synchronization & CDN Publishing**:
   - Cloud Firestore is the **LIVE SOURCE OF TRUTH for Admin Portal & Waveform Studio** (`/admin/markers`, `/admin/hymns`, `/admin/seasons`, `/admin/cantors`) as well as the source from which the CDN compiler builds the live catalog.
   - **MANDATORY FIRESTORE WRITES**: NEVER write only to local `.json` files or manually upload storage files. When adding or updating hymns, seasons, cantors, or recordings, you MUST write directly to Cloud Firestore (`hymns/{hymnId}`, `genres/{genreId}`, `cantors/{cantorId}`, `recordings/{recordingId}`).
   - **Hymns Awaiting Audio**: Hymns with complete lyrics awaiting audio recordings are fully supported and display under their liturgical subgenre with a `"No recordings"` badge. Never filter them out.
   - Local sync across Web (`src/data/`, `data/`, `public/data/`) and Mobile (`../cantor_hymns_mobile/src/data/`).
   - Live edge CDN push directly to Firebase Storage (`data/catalog.json`) compiled from Firestore.
   - Bump `STORAGE_CACHE_KEY` in `src/lib/services/catalog.ts` if structural/schema changes occur to avoid stale client `localStorage` caching.

## System Architecture & Tech Stack
- **Framework**: Next.js 15.5.9 (App Router, TypeScript)
- **Styling**: Tailwind CSS & Shadcn UI
- **Metadata Architecture**: Dual-tier architecture:
  1. **Cloud Firestore (Live Admin DB)**: Powering Waveform Studio, Hymn Editor, Seasons Manager, and Users/Permissions. Queried live in admin.
  2. **Static Edge CDN & JSON Catalog (`data/catalog.json`)**: High-speed edge cached copy serving public Web player and Mobile apps offline bundle.
  - **CRITICAL - ZERO SPLIT-BRAIN LAW**: When modifying markers, lyrics, subgenres, or hymn metadata, **NEVER bypass Cloud Firestore**. Firestore is the primary source of truth; local files and the CDN `catalog.json` are downstream projections. If Cloud Firestore is not updated, Cantor Studio will display stale data and any subsequent admin publish will overwrite CDN changes!
- **Media Storage**: Firebase Storage (audio tracks as `.mp3`, markers as `.txt`, lyrics as `.md`, catalog as `.json`)
- **AI Integration**: Genkit (`@genkit-ai/googleai`) using Gemini-2.5-flash

## Device-Specific Configuration Quirks
- **npm Registry Override**: The host machine has `npm.apple.com` set globally. To allow dependency installation in this project, a local `.npmrc` is configured in the project root:
  ```text
  registry=https://registry.npmjs.org/
  ```
- **Port/Host**: The Next.js dev server starts locally on `http://localhost:3000`.

## Git & Workflow Rules
- **No Automatic Pushing**: Under no circumstances should the AI agent run `git push`. Pushing to the remote GitHub repository is managed solely by the user. The AI is permitted to make local edits and create files, but Git commits and pushes are reserved for the user.

## Key Architectural Decisions
1. **Shadcn Calendar**: Downgraded `react-day-picker` to `@8` to match the custom calendar component signature. Do not upgrade to `@10` without rewriting `src/components/ui/calendar.tsx`.
2. **Next.js Config**: Moved `allowedDevOrigins` to the root of `next.config.ts` (instead of `experimental`) to satisfy Next.js 15 type definitions.
3. **Implicit Any Types**: Props in `src/components/hymn-player.tsx` are typed using the `HymnPlayerProps` interface to prevent compile failures under strict TS settings.
4. **Player Marker Architecture**:
   - `markers.txt` must **never** contain `0.00`. The player automatically prepends `0` for Section 1 (`const marksForLooping = [0, ...sortedActiveMarks]`). For an $N$-verse hymn, `markers.txt` must contain exactly $N-1$ timestamps (Marker 1 = Verse 2, Marker 2 = Verse 3, etc.).
   - `lyrics_markers.txt` must be a **newline-separated list of integers** (`0\n1\n2...`), NOT a JSON string. Each line $i$ maps Verse $i$ (1-based) to its section index (`0` for track start, `1` for Marker 1, `2` for Marker 2, etc.).
   - For doxologies and hymns without melisma, markers are placed strictly at verse boundaries.
   - **User Marker Feedback Vocabulary**:
     - When the user says a verse *"started earlier"*, it means the audio started **earlier than it should have** (prior section / trailing syllables are bleeding into this section) -> the marker timestamp must be **delayed (moved later / increased)**.
     - When the user says a verse *"started later"*, it means the audio started **later than it should have** (first syllable or attack was clipped/missed) -> the marker timestamp must be **advanced (moved earlier / decreased)**.
   - Trimming must leave **`0.5s`** quiet lead-in before the first vocal attack.
   - Lyrics fetched from Tasbeha.org must have leading alternating crosses (`+ `) stripped from stanzas.
   - Subgenres are governed by the `content` field in `genres/{genreId}` in Cloud Firestore (formatted as `subGenre:<Name>` blocks), mirrored to `genres/content/<genre>_content.txt` in Storage, and mapped via `subGenreId: { <genre>: '<Subgenre>' }` on hymn documents. Any subgenre reorganization MUST update `genres/{genreId}.content` in Cloud Firestore first.
5. **Recitative & Doxology Marker Placement Protocol (Roumi / Mo'aqab Ground Truth)**:
   - **Breather Pre-Roll (~100–250ms)**: Never place markers flush on the first consonant attack. Leave `~150–250ms` (approx `0.15–0.25s`) of clean breather gap before the vocal attack so section looping begins with an audible breath rather than an abrupt onset.
   - **The Mid-Stanza / 2nd-Line Pause Trap**: In 4-line recitative verses, deep breath pauses often occur after Line 1, while the verse boundary (into Line 1) has little or no pause. Blind valley detectors latch onto the post-Line 1 pause, putting markers 2–4 seconds into the verse. Markers MUST be anchored to the opening word of Line 1.
   - **The Universal "Tenti Oo Ne" (Ⲧⲉⲛϯⲱ̀ⲟⲩ ⲛⲉ) Final Verse Rule**: The opening line (*"Ten-ti-o-ou ne o-the-ets-mamat"*) lasts ~5 seconds before a major pause at *"Sha pi-nifi"*. Naive detectors consistently lag by ~5 seconds. Always anchor the marker ~5 seconds earlier at the true onset of `Ⲧⲉⲛϯⲱ̀ⲟⲩ ⲛⲉ`.
   - **Breathless / Continuous Verse Transitions**: When a cantor sings across verse boundaries on a single breath, detect the melodic cadence resolution of the previous verse and place the marker at the pitch/phoneme restart of the new verse with a `-150ms` pre-roll buffer.
   - **4th-Line Intra-Verse Pauses**: Beware internal pauses before the final cadence word of a verse (e.g. *"ymnoumen se"* ... pause ... *"adikhostasia"*).
   - **Phonetic Verification**: Always verify the exact timestamp where the previous verse's final word ends and the next verse's opening word begins before placing markers.
6. **Archival Track Audio & Metadata Policies**:
   - **Audio Fidelity**: Do not apply DSP, reverb, convolution, or heavy remastering filters by default. Preserve original recordings unaltered unless explicitly requested by the user.
   - **Spoken Intros**: Trim spoken Arabic announcements (e.g. *"الرومي الأول: يقال بعد..."*) from archival recordings, maintaining a clean `0.5s` lead-in before chanting.
   - **Titles & Descriptions (Strict Rule)**: Never auto-generate or invent descriptions for seasons, cantors, or hymns. All descriptions must remain empty (`""`) unless the user explicitly provides the exact description text. For sequential series (e.g. Roumi 1–9, Mo'aqab 1–9), keep titles concise (e.g. `"Roumi 1"`) without opening lyrics.

## Current Project Status
- [x] Web app migrated from Firebase Studio export
- [x] Dependencies installed successfully
- [x] Typechecking passing completely (`npm run typecheck`)
- [x] Production build succeeding (`npm run build`)
- [x] Dev server verified and functional (`npm run dev`)
- [x] Committed all local changes and configurations
- [x] Changed Git remote origin to `https://github.com/cantorhymns/cantor_hymns_web.git`
- [x] Pushing to GitHub (Successfully authenticated and pushed)
- [x] Created `src/scripts/add-ondos.ts` to add the new "Ondos" hymn and its HICS recording
- [x] Created `src/scripts/add-enthoten-dhe.ts` to add the new "Enthoten Dhe" hymn and its HICS recording
- [x] Configured mobile project (`cantor_hymns_mobile`) with EAS Build & TestFlight submission
- [x] Uploaded iOS production build 1.0.0 (1) to Apple App Store Connect / TestFlight
- [x] Prepared App Store marketing assets (5244x2950 promo banner, promotional copy, keywords)
- [x] Added static `/privacy` Privacy Policy page and global footer for `cantorhymns.com/privacy`
- [x] Synced missing `lyricsMappingUrl` fields for Kiahk Psalm 150, Ke Eperto, and Tenen to live Firebase Storage catalog
- [x] Implemented native iOS Lock Screen, Control Center, Dynamic Island, and CarPlay Now Playing controls in mobile app (`expo-audio` `setActiveForLockScreen` with track metadata & artwork)
- [x] Added 18 Roumi and Mo'aqab hymns for Kiahk Vespers Praises (Cantor Tharwat) with clean titles, trimmed intros, original audio, and published to live CDN catalog
- [x] Generated and verified precise verse markers for all 18 Roumi and Mo'aqab hymns (Roumi 1–9 and Mo'aqab 1–9) with 1:1 lyrics mapping, published to Firebase Storage and live edge CDN catalog
- [x] Added 4 Kiahk distribution hymns (`Je Efesmaroout (Weekdays)`, `Ti Parthenos (Weekdays)`, `Je Efesmaroout (Weekends)`, `Ef-Emepsha Ghar (Weekends)`) with complete 3-language lyrics, organized directly under Kiahk `subGenre:Liturgy` following Psalm 150, and published live to edge CDN catalog

## Next Steps / Backlog
1. **Test Lock Screen Controls**: Run local build / Expo to test Lock Screen player widget and car audio playback.
2. **App Store Review & Release**: Complete App Store submission (Age rating, contact info, screenshots).
3. **CarPlay Entitlement (v1.1 Roadmap)**: Request Apple CarPlay Audio Entitlement on developer.apple.com for car dashboard app icon.
3. **Interactive Audio Player Tuning**: Test and tune marker snaps, AB-looping, and playhead rendering.
4. **AI Integration**: Implement server-side AI tutors using Genkit flows.
