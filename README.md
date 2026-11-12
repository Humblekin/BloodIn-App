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

## BloodIn CareDesk roles and account setup

BloodIn CareDesk is the separate web portal for health workers, facility owners, and system administrators. Its source and configuration live in `health-worker-portal/`, so it can be deployed independently from the Expo mobile app.

To deploy CareDesk to Netlify, connect this repository to a new Netlify site. The root `netlify.toml` is configured to build the CareDesk folder. Add these environment variables in the Netlify site settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not configure `VITE_DEV_SKIP_MFA` for production. The Supabase anon key is client-visible; never add service-role or Paystack secret keys to this site.

The portal has system-wide and facility-scoped roles:

- A **system admin** manages the facility directory, facility activation and verification, and appoints facility owners.
- A facility **owner** manages staff accounts for that organization and can promote staff to organization admin.
- Organization **admins** can help manage staff at their organization. Neither owners nor organization admins gain access to other organizations.
- **Staff** can record donations only when enabled for that facility and while its verification and active status permit recording.

New facilities are created as unverified. A system admin must verify a facility before its assigned staff can record donations. Only an authorized deployment operator can bootstrap the first system admin: create the user in Supabase Auth, then set the trusted `system_role` app metadata for that user's Auth UUID in the Supabase SQL editor:

```sql
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  '{"system_role":"system_admin"}'::jsonb
WHERE id = '<SYSTEM_ADMIN_AUTH_USER_UUID>';
```

Sign out and back in after setting the claim. Do not expose the service-role key or allow public users to set `system_role`. System admins can then add facilities and create a named owner account for each one from the portal.

An owner account is individual to one organization. The system admin receives a randomly generated temporary password once and shares it directly with that owner. The owner must change it and enroll authenticator-based two-factor authentication at first sign-in. Owners create staff accounts from **Recording staff**; the worker's temporary password is likewise shown once, and the worker must change it and enroll MFA. Existing Auth emails cannot be assigned a second password by these flows.

Apply database migrations and deploy the required Edge Functions before using account provisioning:

```sh
supabase db push
supabase functions deploy system-admin
supabase functions deploy create-staff-account
supabase functions deploy complete-staff-password-change
```

The functions use Supabase's server-side service-role environment variable; never add a service-role key to the web app or its `VITE_` variables.

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