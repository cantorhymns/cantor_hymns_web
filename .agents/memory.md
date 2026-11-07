# Project Memory & Development Log

This file serves as the persistent "memory" for AI development sessions across multiple devices. Whenever starting a new session, review this file to understand the current state, configuration details, and next tasks.

## System Architecture & Tech Stack
- **Framework**: Next.js 15.5.9 (App Router, TypeScript)
- **Styling**: Tailwind CSS & Shadcn UI
- **Metadata Architecture**: Static JSON files (`src/data/`, `public/data/`, and `../cantor_hymns_mobile/src/data/`) synced live with Firebase Storage (`data/catalog.json`). **Firestore is fully decommissioned** — do NOT read from or write to Firestore in any scripts, services, or tools.
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
   - Subgenres are governed by `genres/content/<genre>_content.txt` in Firebase Storage and mapped via `subGenreId: { <genre>: '<Subgenre>' }`.
5. **Recitative & Doxology Marker Placement Protocol**:
   - **Never guess or randomly nudge markers**: If a user reports a marker is early/late, re-analyze with phonetic alignment rather than nudging timestamps.
   - **Beware 4th-Line Intra-Verse Pauses**: In Coptic doxologies and recitative hymns (e.g. Roumi, Mo'aqab), the 4th line of a stanza frequently has an internal breath pause before the final cadence phrase (e.g., Verse 1 line 4 *"ymnoumen se"* ... pause ... *"adikhostasia"*). Energy valley detectors often mistakenly latch onto this pause, setting markers 2-3 seconds early and catching the final word of the previous verse.
   - **Phonetic Verification**: Always verify the exact timestamp where the previous verse's final word ends and the next verse's opening word begins (using Whisper word timestamps or waveform phoneme inspection) before placing markers. Markers belong in the breath gap `50-100ms` prior to the new verse onset.
6. **Archival Track Audio & Metadata Policies**:
   - **Audio Fidelity**: Do not apply DSP, reverb, convolution, or heavy remastering filters by default. Preserve original recordings unaltered unless explicitly requested by the user.
   - **Spoken Intros**: Trim spoken Arabic announcements (e.g. *"الرومي الأول: يقال بعد..."*) from archival recordings, maintaining a clean `0.5s` lead-in before chanting.
   - **Titles & Descriptions**: For sequential series (e.g. Roumi 1–9, Mo'aqab 1–9), keep titles concise (e.g. `"Roumi 1"`) without opening lyrics, and omit descriptions unless specifically asked.

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
- [x] Generated and verified precise verse markers for `roumi-1` with 1:1 lyrics mapping

## Next Steps / Backlog
1. **Test Lock Screen Controls**: Run local build / Expo to test Lock Screen player widget and car audio playback.
2. **App Store Review & Release**: Complete App Store submission (Age rating, contact info, screenshots).
3. **CarPlay Entitlement (v1.1 Roadmap)**: Request Apple CarPlay Audio Entitlement on developer.apple.com for car dashboard app icon.
3. **Interactive Audio Player Tuning**: Test and tune marker snaps, AB-looping, and playhead rendering.
4. **AI Integration**: Implement server-side AI tutors using Genkit flows.
