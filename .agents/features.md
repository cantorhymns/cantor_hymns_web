# Web Application Features

This document maps and details the core features of the Cantor Coptic Hymn Learning web application, specifying the components, hooks, and files associated with each feature.

---

## 1. Interactive Audio Player (Learn & Listen Modes)
High-performance audio player designed for learning complex hymn arrangements.
- **Components**: `src/components/hymn-player.tsx`, `src/components/hymn-player-tutorial.tsx`
- **Capabilities**:
  - **Learn Mode**: Loads markers from a text file in Storage to divide the track into sections. Snaps to markers during navigation.
  - **Listen Mode**: Standard uninterrupted audio streaming.
  - **A-B Section Looping**: Continuously loops the current section when repeat is enabled.
  - **Custom Waveform & Playhead**: Responsive visual waveform that scrolls to keep the active playhead centered during playback.
  - **Playback Speed**: Adjust speed from 1.0x to 2.0x.
  - **System Media Session Integration**: Integrates with device lock screens and physical media keys using the web Media Session API (supports Play/Pause, Next/Prev track).

---

## 2. Multi-Language Lyrics Engine
Synchronized lyrics engine showing liturgical texts in up to three languages simultaneously.
- **Components**: `src/components/hymn-player.tsx` (specifically the `LyricsDisplay` component)
- **Hooks**: `src/lib/hooks/useFileContent.ts` (helper to fetch `.md` lyrics files)
- **Capabilities**:
  - Supports side-by-side or stacked columns of English, Coptic, and Arabic text.
  - Languages can be toggled on/off individually.
  - Dynamically cycles font size (`sm`, `base`, `lg`, `xl`) for ease of reading.
  - Uses Markdown rendering (`react-markdown`, `remark-gfm`, `remark-breaks`) for rich formatting.

---

## 3. CantorCloud
Continuous, randomized playback feed for passive listening.
- **Pages**: `src/app/cantor-cloud/page.tsx`
- **Components**: `src/app/cantor-cloud/cantor-cloud-client-page.tsx`, `src/components/playlist.tsx`
- **Capabilities**:
  - Shuffles and queues hymns that have active recordings.
  - Allows selecting specific tracks from the dynamic playlist.
  - Features autoplay and endless cycling through tracks.

---

## 4. Command Palette Search (Cmd+K)
Global, keyboard-accessible search interface to quickly find database entries.
- **Components**: `src/components/hymn-search-dialog.tsx`, `src/components/search-provider.tsx`
- **Hooks**: `src/lib/hooks/use-search-data.ts`
- **Capabilities**:
  - Listens for `Cmd+K` / `Ctrl+K` keybinds to open the command palette.
  - Searches dynamically across hymns, genres, and cantors.
  - Allows instant keyboard-navigation and routing to targeted hymn pages.

---

## 5. Firebase Integration & Backend Sync
Fully serverless architecture leveraging Firebase services.
- **Configuration**: `src/firebase/config.ts`, `src/firebase/client-provider.tsx`
- **Services**:
  - **Authentication**: `src/firebase/auth/use-user.tsx` (supports Anonymous Guest Sessions).
  - **Firestore**: Data persistence for `genres`, `hymns`, `cantors`, and `recordings`. Managed via React Hooks (`src/firebase/firestore/use-collection.tsx`, etc.).
  - **Storage**: Media bucket for hosting audio `.mp3` tracks, markers `.txt` files, and lyrics markdown files.
