
# Cantor - Coptic Hymn Learning App

This is a high-performance Next.js 15 application built with React, Tailwind CSS, ShadCN UI, and Firebase.

## Core Features
- **Interactive Audio Player:** Features a custom visual waveform, marker-based navigation (Learn Mode), and advanced A-B section looping.
- **Multi-Language Lyrics Engine:** Supports synchronized display of English, Coptic, and Arabic text with adjustable font sizes.
- **CantorCloud:** A continuous, randomized playback feature for hands-free listening.
- **Global Search:** Command-palette style search (Cmd+K) for quick access to hymns, genres, and cantors.
- **Firebase Backend:** Fully integrated with Firestore (data), Firebase Auth (anonymous sessions), and Firebase Storage (media).

## Documentation
- [CORS Fix](./docs/CORS_FIX.md): Essential step if audio or lyrics fail to load.

## Database Management
This project includes built-in scripts to manage your Firestore data. You can run these from your terminal:
- `npm run db:seed`: Resets the database and seeds it with initial genres, hymns, and cantors.
- `npm run db:clean`: Removes unapproved or duplicate entries to maintain data integrity.
