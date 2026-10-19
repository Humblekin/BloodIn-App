# Implementation Tasks

- [x] Phase 1 - 3 Foundation & Shell
- [x] Complete Database Schema Migration (added remaining 18 tables)
- [x] Build Service Layer (Auth, Profile, Connection, Communities, Messages, Requests, Campaigns, Moderation, Notifications, Location)
- [x] Phase 4: Blood Requests
    - [x] `RequestCard` and `UrgencyBadge` components
    - [x] `useBloodRequests` hook
    - [x] `requests/create.tsx` screen
    - [x] `requests/[id].tsx` screen
- [x] Phase 5: Communities & Campaigns
    - [x] Community Components (`CommunityCard`, `MemberList`, `AnnouncementCard`)
    - [x] `useCommunity` hook
    - [x] `community/create.tsx` screen
    - [x] `community/manage.tsx` screen
    - [x] Campaign Components & Hooks
    - [x] `campaigns/create.tsx` screen
    - [x] `campaigns/[id].tsx` screen
- [x] Phase 6: Posts & Network Feed
    - [x] `postService`, `usePosts` hook, PostCard component
    - [x] `feed.tsx` (Feed tab), `posts/create.tsx`, `posts/[id].tsx`
    - [x] Post visibility RLS (`can_view_post` helper, blocked-user exclusion)
    - [x] `post_comments`, `post_reactions` tables + RLS
- [x] Moderation & Safety
    - [x] `useReporting` and `useBlocking` hooks
    - [x] `profile/safety.tsx` (Safety Center — blocked users list, unblock, guidelines)
    - [x] `ReportModal` component (wired into posts, user profiles, connections)
    - [x] `BlockConfirmation` component (wired into OrbitProfileModal, connections)
- [x] Shared Utilities
    - [x] `useDebounce`, `useNetworkStatus`, geo utils
- [x] Wire existing screens to services (replace mock data)
    - [x] Connect `messages/index.tsx` & `messages/[id].tsx`
    - [x] Connect `profile/connections.tsx`
    - [x] Connect `notifications.tsx`
    - [x] Connect `community/[id].tsx`
- [x] Premium System
    - [x] `upgrade_to_premium` SECURITY DEFINER RPC (bypasses privilege-escalation trigger)
    - [x] `find_nearby_users` RPC returns `is_premium`
    - [x] `premiumService.ts`, `PremiumBadge`, `profile/premium.tsx` upgrade screen
    - [x] Premium nav link + badge on profile, orbit modal, connections
    - [x] Feed boost perk (premium authors' 24h posts float to top)
- [x] Location, Orbit, Donation Willingness & Connection Chat Overhaul
    - [x] Single authoritative location service (`locationService.ts`) with real GPS acquisition, accuracy checks, and permission handling
    - [x] Removed hardcoded Accra/city fallback coordinates in `LocationPicker`
    - [x] Strict geographic ascending distance sorting in Orbit (`orbitService.ts` and `OrbitCanvas.tsx`)
    - [x] Added `donation_willingness` (`willing` | `not_willing` | `unspecified`) to profiles, setup-profile, and edit-profile screens
    - [x] Filter willing-only donors in Orbit and Discover
    - [x] Connection request lifecycle and backend-enforced chat authorization (RLS + `create_direct_conversation` RPC)
    - [x] Automated test suite in `scripts/test_overhaul.js` and clean TypeScript verification

## Mobile Redesign Track (2026-10-17)

The checklist above tracks earlier feature implementation, not completion of the newly supplied visual redesign brief.

### Audit and documentation
- [x] Inspect Expo / React Native versions, routing, primary screens, shared tokens, local imagery, and existing project docs.
- [x] Confirm the primary routes: tab home, message conversation, and blood request details.
- [x] Locate and inspect `assets/images/Screenshot (2).png`, the three-screen visual reference.
- [x] Record the architecture, textual screen specification, and current audit in `planning.md`.
- [x] Record redesign and preservation constraints in `rules.md`.
- [x] Add project setup and test instructions in `README.md` and begin `CHANGELOG.md`.

### Redesign implementation
- [x] Define shared vivid-red tokens and apply the reference palette to the redesigned surfaces.
- [x] Redesign home while retaining live requests, feed, search/discovery, and working quick actions.
- [x] Redesign conversation while retaining authorization, Supabase Realtime, message sending, and keyboard behavior.
- [x] Redesign request/coordination details while retaining real request data and offer-to-help behavior.
- [ ] Apply the visual system to other existing screens without removing functionality.
    - [x] Added a shared `Header` brand (vivid-red) variant with light foreground and a scrim back button for `transparent` headers; neutral `surface` remains the default.
    - [x] Brand header applied to Discover, Blood Requests, Feed, Messages list, Profile, Notifications, Post detail/create, and the Profile sub-screens (Edit, Connections, Safety, Privacy, Premium, Donate).
    - [x] Added the shared brand header to the stack-hidden form screens (Request, Community, Campaign create/manage/detail) which previously rendered no header and had no visible back affordance.
    - [x] Aligned the Requests list card with the new system (border-only, no drop shadow).
    - [ ] Orbit (intentionally dark HUD) and the auth onboarding screens retain their dedicated treatments; rendered comparison still pending.
- [x] Run `node scripts/test_overhaul.js`; all five existing checks passed on 2026-10-17.
- [x] Run `node ./node_modules/typescript/bin/tsc --noEmit --incremental false`; passed on 2026-10-17. The `npm run typecheck` wrapper could not write its npm log because C: had no free space.
- [ ] Launch the app with an authenticated session, capture all three target screens, and compare with `assets/images/Screenshot (2).png`.

### Current audit notes and next task
- Existing home screen is `src/app/(main)/(tabs)/index.tsx`; it already fetches active requests and feed posts.
- Existing conversation screen is `src/app/(main)/messages/[id].tsx`; it uses `useMessages` and a Supabase Realtime subscription.
- Existing request detail is `src/app/(main)/requests/[id].tsx`; it supports real request details and offers to help.
- The reference image `assets/images/Screenshot (2).png` is confirmed; the request-detail route is the third screen and is opened from request cards.
- Existing local photos are `assets/images/blood_donation_hero.jpg` and `assets/images/blood_donation_care.jpg`.
- The working tree already contains unrelated/uncommitted user changes, including user-deletion migrations/tests, package metadata, LICENSE, and images. Preserve them.
- The web app currently redirects unauthenticated preview sessions to Welcome; do not weaken the auth gate to capture private screens.
- Home, conversation, and request-detail implementations now follow the reference composition while preserving their existing services. Rendered screenshot comparison is still pending.
- Home now orders quick actions like the reference and places Emergency Blood before availability/feed content. Request details use a portrait arch photo and put live stats at the top of the information panel.
- Visible bottom navigation is Home, Messages, Orbit, Discover, and Profile per the user's instruction to keep Orbit as a tab. Requests and Feed remain reachable from Home; Messages reuses the existing message-list screen through a tab adapter.
- Location runtime fix: the user's browser trace showed `Location.isLocationServicesEnabledAsync is not a function` before the permission request. Replaced it with Expo Location's supported `hasServicesEnabledAsync()` API and corrected the misleading ambient type declaration. Orbit no longer warns for the expected `LOCATION_REQUIRED` onboarding state.
- Mobile location capture requests High accuracy, asks Android to enable its network location provider when services are off, retries Balanced if High capture fails, then retries Highest when reported accuracy is worse than 1 km. Native readings up to 5 km uncertainty are accepted; poorer readings show a precise-location prompt. iOS displays an Open Settings action when system Location Services are disabled. Web preview accepts estimates up to 25 km with an approximation warning; mobile behavior remains the priority. Ghana city labels use Haversine distance and are only assigned within 50 km; exact GPS coordinates remain authoritative for PostGIS matching.
- Direct TypeScript and all five overhaul checks pass after these changes. Android/iOS permission prompts and authenticated Supabase location writes still require a device/session for end-to-end verification.
- Earlier browser inspection also found geolocation denied for `localhost:8081`; once the API crash is fixed, the browser still needs location permission enabled. Supabase `find_nearby_users` exists and rejected an unauthenticated probe at its authorization guard; authenticated location persistence/results remain unverified.
- Discover now detects missing saved coordinates and offers the existing GPS-to-Supabase location flow directly. Permission/save failures are shown with retry guidance.
- Discover no longer filters people to the signed-in user's blood group by default and requests up to 100 nearby candidates for its local text filter. The RPC still applies its privacy rules and default 25 km radius.
- Password recovery now routes from Login to the email form, sends a Supabase reset link back to `bloodin://reset-password`, establishes a recovery session through the root deep-link handler, validates the new password, and updates it with Supabase Auth. The shared browser was already on Orbit during the CTA smoke-test attempt, so no email was sent.
- Supabase Auth redirect allow-list must include `bloodin://reset-password` for native builds (and the app's web reset URL when testing web).
- Visual-system rollout: the shared `Header` now supports `variant="brand"` (vivid `#F20D19`, white title/back) and `transparent` now renders a white arrow on a `rgba(17,24,39,0.35)` scrim for legibility over cover imagery. Discover, Blood Requests, Feed, Messages list, Profile, Notifications, Post detail/create, the Profile sub-screens (Edit, Connections, Safety, Privacy, Premium, Donate), and the Request/Community/Campaign create/manage/detail screens now use it. Requests list cards were changed to border-only (no shadow) to match home/discover. Orbit stays dark by design; auth onboarding screens were left unchanged. Direct `tsc --noEmit` and `node scripts/test_overhaul.js` both pass after these edits; rendered comparison is still pending.
- **Next task:** allow the password recovery redirect in Supabase Auth settings and verify it end to end; capture the three redesigned screens plus a sample of the newly brand-headered screens for comparison with `assets/images/Screenshot (2).png`; verify native GPS prompts and authenticated location RPCs on a device.

