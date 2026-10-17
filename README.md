# BloodIn

BloodIn is an Expo and React Native application for blood donation coordination, donor discovery, requests, communities, and messaging, backed by Supabase.

## Requirements

- Node.js and npm
- Expo-compatible Android/iOS device or emulator for native runs; a browser is available for the web target
- A Supabase project for authenticated and database-backed features

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to your Supabase project values. Keep `.env` private; never put service-role or payment secrets in client variables.
3. Start Expo with `npm start`, or use `npm run android`, `npm run ios`, or `npm run web` for a target-specific run.

Some app flows require the Supabase schema and Edge Functions configured for this project. Database migrations are under `supabase/migrations/`.

## Checks

- `npm test` runs the project overhaul verification script.
- `npm run test:user-deletion` runs user deletion checks.
- `npm run typecheck` runs TypeScript without emitting files.

Record failures accurately. In particular, an out-of-memory exit from TypeScript is not a passing typecheck.

## Project map

- `src/app/`: Expo Router screens and layouts
- `src/features/`: feature services, hooks, and domain components
- `src/components/`: shared UI and layout components
- `src/constants/`: shared design tokens
- `src/lib/supabase/`: Supabase client setup
- `supabase/`: SQL migrations and Edge Functions

See `planning.md`, `rules.md`, and `task.md` for architecture, development constraints, and current work status.