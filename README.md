
# Cantor - Coptic Hymn Learning App

This is a high-performance Next.js 15 application built with React, Tailwind CSS, ShadCN UI, and Firebase.

## Core Features
- **Interactive Audio Player:** Features a custom visual waveform, marker-based navigation (Learn Mode), and advanced A-B section looping.
- **Multi-Language Lyrics Engine:** Supports synchronized display of English, Coptic, and Arabic text with adjustable font sizes.
- **CantorCloud:** A continuous, randomized playback feature for hands-free listening.
- **Global Search:** Command-palette style search (Cmd+K) for quick access to hymns, genres, and cantors.
- **Firebase Backend:** Fully integrated with Firestore (data), Firebase Auth (anonymous sessions), and Firebase Storage (media).

## How to Download the Code

1. **Export as Archive (Terminal):**
   - Run `npm run code:export` in the terminal.
   - Right-click the generated `codebase.tar.gz` in the file explorer and select **Download**.
2. **Push to GitHub:** Click the **GitHub** icon in the toolbar to connect your project to a remote repository.

## Local Setup Instructions

Once you have downloaded and unzipped the code:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Firebase Configuration:**
   The project is already pre-configured with your `firebaseConfig` in `src/firebase/config.ts`. Ensure your Firebase project has Firestore, Authentication (Anonymous), and Storage enabled in the Firebase Console.

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the results.

## Documentation
- [Mountain Duck Setup](./docs/MOUNTAIN_DUCK_SETUP.md): How to manage your audio files as a local drive.
- [CORS Fix](./docs/CORS_FIX.md): Essential step if audio or lyrics fail to load.
- [Mobile Conversion](./docs/mobile-conversion-prompt.md): AI prompt for moving to iOS/Android.

## Database Management
This project includes built-in scripts to manage your Firestore data. You can run these from your terminal:
- `npm run db:seed`: Resets the database and seeds it with initial genres, hymns, and cantors.
- `npm run db:clean`: Removes unapproved or duplicate entries to maintain data integrity.
- `npm run db:add-[hymn-name]`: Various specific scripts created to add new hymns and recordings dynamically.
