# Project Memory & Development Log

This file serves as the persistent "memory" for AI development sessions across multiple devices. Whenever starting a new session, review this file to understand the current state, configuration details, and next tasks.

## System Architecture & Tech Stack
- **Framework**: Next.js 15.5.9 (App Router, TypeScript)
- **Styling**: Tailwind CSS & Shadcn UI
- **Database**: Firestore (genres, hymns, cantors, recordings)
- **Storage**: Firebase Storage (audio tracks as `.mp3`, markers as `.txt`)
- **AI Integration**: Genkit (`@genkit-ai/googleai`) using Gemini-2.5-flash

## Device-Specific Configuration Quirks
- **npm Registry Override**: The host machine has `npm.apple.com` set globally. To allow dependency installation in this project, a local `.npmrc` is configured in the project root:
  ```text
  registry=https://registry.npmjs.org/
  ```
- **Port/Host**: The Next.js dev server starts locally on `http://localhost:3000`.

## Key Architectural Decisions
1. **Shadcn Calendar**: Downgraded `react-day-picker` to `@8` to match the custom calendar component signature. Do not upgrade to `@10` without rewriting `src/components/ui/calendar.tsx`.
2. **Next.js Config**: Moved `allowedDevOrigins` to the root of `next.config.ts` (instead of `experimental`) to satisfy Next.js 15 type definitions.
3. **Implicit Any Types**: Props in `src/components/hymn-player.tsx` are typed using the `HymnPlayerProps` interface to prevent compile failures under strict TS settings.

## Current Project Status
- [x] Web app migrated from Firebase Studio export
- [x] Dependencies installed successfully
- [x] Typechecking passing completely (`npm run typecheck`)
- [x] Production build succeeding (`npm run build`)
- [x] Dev server verified and functional (`npm run dev`)

## Next Steps / Backlog
1. **Interactive Audio Player Tuning**: Test and tune marker snaps, AB-looping, and playhead rendering.
2. **AI Integration**: Implement server-side AI tutors using Genkit flows.
3. **Mobile Client Preparation**: Once web features are fully stabilized, prepare the mobile client in `cantor_hymns_mobile` targeting the same Firebase project.
