# Supabase Auth — Redirect URLs & Password-Reset Setup (manual dashboard steps)

The BloodIn app requests password resets with an explicit redirect:

| Flow | Redirect URL sent by the app | Route in app |
|---|---|---|
| Password recovery | `bloodin://reset-password` | `(auth)/reset-password` |
| E-mail confirmation (sign-up) | `bloodin://auth/callback` | `auth/callback` |

The redirect URL is generated at runtime with `Linking.createURL(..., { scheme: 'bloodin' })`
(see `src/features/auth/authCallback.ts`). In a production/installed build this
resolves to the `bloodin://` custom scheme configured in `app.json`.

## Why links opened `localhost:3000`

Supabase only honours a `redirect_to`/`emailRedirectTo` value that is
**allowlisted**. If it is not allowlisted, GoTrue silently falls back to the
project **Site URL**, which for a new project defaults to
`http://localhost:3000` — producing `ERR_CONNECTION_REFUSED` when the link is
opened.

Changing source code alone does **not** fix this. The dashboard configuration
below is required.

## Required dashboard configuration (manual)

In the Supabase dashboard → **Authentication → URL Configuration**:

1. **Site URL**
   - Set it to a real HTTPS URL you control (production web origin), *not*
     `http://localhost:3000`.
   - If BloodIn has no web front-end, set it to your project's own HTTPS
     endpoint or another stable HTTPS placeholder you own, so accidental
     fallbacks never land on a dead localhost address.

2. **Redirect URLs — add every value the app can send:**

   ```
   bloodin://reset-password
   bloodin://auth/callback
   ```

   When testing from a development build / Expo Go the runtime URL differs —
   add whatever `Linking.createURL('reset-password', { scheme: 'bloodin' })`
   prints in that environment as well, for example:

   ```
   exp://<host>:8081/--/reset-password
   exp://<host>:8081/--/auth/callback
   ```

   (Expo Go can only be opened through its own `exp://` scheme; a **custom
   scheme only works in an installed/dev-client build**.)

3. **E-mail templates** (Authentication → Emails → Templates):
   - **Recover template** and **Confirm signup template** must use
     `{{ .ConfirmationURL }}` as the link. Do not hardcode
     `http://localhost:3000` (or any other URL) inside the template.

## Installed-Android considerations (honest limitations)

- A custom scheme (`bloodin://`) is handled by the installed app. It does
  **not** work in Expo Go (Expo Go only opens `exp://` links) and it does not
  work if the e-mail is opened on a device without the app installed.
- Some e-mail clients open links inside an in-app browser. GoTrue performs the
  verification first and then redirects; if that browser cannot hand the
  `bloodin://` URL to the app, the link will appear to do nothing. This cannot
  be verified from source code alone — test on a real device with the installed
  build.
- For reliable one-tap opening across e-mail clients, add an **Android App
  Link** (verified HTTPS universal link) once you own a domain. This requires:
  1. Hosting `/.well-known/assetlinks.json` on the HTTPS domain containing the
     app's package name (`com.bloodlink.app`) and SHA-256 certificate fingerprint.
  2. Adding to `app.json` under `expo.android`:

     ```json
     "intentFilters": [
       {
         "action": "VIEW",
         "data": [
           { "scheme": "https", "host": "YOUR_DOMAIN", "pathPrefix": "/auth" }
         ],
         "category": ["BROWSABLE", "DEFAULT"]
       }
     ]
     ```

     and sending the corresponding `https://YOUR_DOMAIN/...` redirect from the
     app instead of the custom scheme.

  This is intentionally **not** configured yet because BloodIn does not yet own
  a verified domain — the custom scheme is the configured flow.

## Callback handling in the app

- `src/features/auth/authCallback.ts` — parses PKCE (`?code=`) and implicit
  (`#access_token=…`) callbacks, validates parameters, maps expired/invalid/
  cancelled links to friendly messages, and deduplicates deliveries so a
  one-time code is never exchanged twice.
- `src/app/(auth)/reset-password.tsx` — lets the user set a new password once a
  recovery session exists; shows link errors (expired/invalid) in-place.
- `src/app/auth/callback.tsx` — handles e-mail confirmation links.
- The Supabase client is configured with `flowType: 'pkce'`
  (`src/lib/supabase/client.ts`); token-fragment callbacks remain supported for
  compatibility.

## Reproducible test procedure (device)

1. Dashboard: allowlist the redirect URLs above (this step cannot be skipped).
2. Installed Android build (not Expo Go): open Login → "Forgot password?" →
   submit a registered e-mail → confirm the e-mail arrives.
3. Tap the link on the same device: the installed app must open on
   **Reset Password** with "Choose a New Password".
4. Set a new password (≥8 chars, upper/lower/digit/special — app policy), then
   sign in with the new password.
5. Expired/invalid link: reuse an old link or request two resets and open the
   older one → the app must show the friendly "expired/invalid" message instead
   of crashing.
6. Cold start: force-close the app, tap the link again → app opens directly on
   the reset screen.
7. Regression: sign-up e-mail confirmation link must open the app's
   confirmation screen and land signed-in; normal login/logout must be
   unaffected.

If step 3 still opens `localhost:3000`, the dashboard allowlist/Site URL
configuration above is incomplete — the app-side redirect is already correct.
