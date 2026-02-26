# Specification for Converting "Cantor" Web App to Mobile (iOS/Android)

**Context:** I have a high-performance web application for learning Coptic hymns. I need to convert it into a native mobile app for iOS and Android. I am looking for the best technical path (e.g., Capacitor, React Native, Project IDX, or Flutter) that allows me to leverage my existing code while ensuring a premium mobile experience.

### 1. Current Technical Stack
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons.
- **UI Components:** ShadCN UI (Radix-based).
- **Backend:** Firebase (Firestore for data, Firebase Auth for Anonymous Sign-in, Firebase Storage for MP3 audio and Markdown lyrics).
- **Data Layer:** Real-time listeners (`onSnapshot`) and custom React hooks for data fetching.

### 2. Core Features to Replicate
- **Custom Interactive Audio Player:**
    - **Modes:** 'Learn Mode' (interactive sections) vs. 'Listen Mode' (standard playback).
    - **Waveform:** A custom-built visual waveform that scrolls dynamically with the playhead.
    - **Marker System:** Precision timestamp markers loaded from external files. Users can toggle markers to create custom loop segments.
    - **A-B Looping:** Advanced "Repeat Section" logic based on active markers.
    - **System Integration:** Integration with system-level media controls (Media Session API) for lock screen and car display navigation.
- **Multi-Language Lyrics Engine:**
    - Synchronized display of English, Coptic, and Arabic.
    - **RTL Support:** Native handling of Arabic text.
    - **Typography:** Custom font rendering for Coptic characters ('Noto Sans Coptic').
    - User-adjustable font sizes and expandable lyric views.
- **Discovery & Navigation:**
    - **Library:** Hierarchical navigation (Genres -> Hymns -> Multiple Cantor Recordings).
    - **CantorCloud:** A randomized, continuous-play playlist feature.
    - **Search:** Global command-palette style search (Cmd+K) using pre-calculated search maps.

### 3. Critical Mobile Requirements
- **Background Audio:** Playback must be seamless when the app is backgrounded or the phone is locked.
- **Lock Screen Controls:** Must show metadata (Hymn Title, Cantor, Artwork) and handle Next/Prev hymn commands.
- **Offline Strategy:** Potential for future "Download for Offline" features for the audio files.
- **Performance:** High-frame-rate rendering of the scrolling waveform during playback.
- **Anonymous Session:** Preservation of the Firebase Anonymous Auth state across app restarts.

### 4. Evaluation Request
Please compare the following paths based on **Development Speed**, **Performance**, and **Ease of Maintenance**:
1. **Capacitor (Ionic):** Wrapping the existing Next.js app.
2. **Project IDX:** Using Google's AI-native dev environment for a web-to-mobile workflow.
3. **React Native:** Rewriting the UI layer while keeping the Firebase logic.
4. **PWA (Progressive Web App):** Keeping it strictly web-based but installable.

Which approach is best suited for a small team/solo developer who wants to maintain a single codebase?