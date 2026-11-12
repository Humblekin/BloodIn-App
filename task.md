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

## Post-redesign feature work (2026-11-09)

- [x] Password recovery flow: `authCallback.ts` handles PKCE + implicit callbacks, dedupes code exchange, maps errors to friendly messages, and never logs raw URLs. Root `_layout.tsx` routes `bloodin://reset-password` to `reset-password.tsx`; `reset-password.tsx` sends the link and validates/updates the password.
- [ ] Add `bloodin://reset-password` (and the app web reset URL) to the Supabase Auth redirect allow-list, then verify the full flow end to end. See `docs/supabase-auth-setup.md`.
- [x] Donation Programme: opt-in donor card with unique member code + QR, and a recognition ledger (`donationService.ts`, `profile/donate.tsx`, migration `20261019000002_donation_programme.sql`). Mutations run through SECURITY DEFINER RPCs (`join_donation_programme`, `leave_donation_programme`, `recognize_donation`).
- [x] Fixed ambiguous column reference in the donation RPCs (`1d42226`) and removed a debug `console.error` in `donate.tsx` so native alerts show instead of the dev RedBox (`26e847e`).
- [x] Security hardening: sanitized credentials, patched dependencies, enforced mutation ownership (`c1da961`).
- [x] Verified on 2026-11-09: `node scripts/test_overhaul.js` (all five checks) and `node ./node_modules/typescript/bin/tsc --noEmit --incremental false` both pass.
- [ ] End-to-end verification still requires an authenticated Supabase session and a device/emulator (donation RPCs, location writes, recovery deep link).

## Community membership lifecycle (2026-11-09)

- [x] Member approval UI in `community/manage.tsx`: pending join requests with approve/decline, and active members with promote (member↔moderator, moderator→admin for admins), demote, and remove (suspend). Admins and moderators can admit/promote; only admins can grant/revoke admin or modify admin rows.
- [x] `communityService` additions: `getPendingMembers`, `getMyMembership`, `setMemberStatus`, `setMemberRole`; `useCommunity` wrappers added.
- [x] Rejoin after leaving now reactivates the existing row (was blocked with "You previously left this community"). Leaving demotes to `member` so a former admin cannot rejoin with elevated rights.
- [x] Pending members can withdraw a request; the community detail screen now shows a "Pending approval" state and "Cancel request" instead of a duplicate Join button.
- [x] Invite-only communities are hidden from `getCommunities` and Discover listings (still reachable by direct link).
- [x] Accurate `member_count` via `sync_community_member_count` trigger + backfill in `supabase/migrations/20261109000000_community_membership_fixes.sql`.
- [x] Security guards in that migration: join status/role forced by `join_policy`, self-approval/escalation blocked, non-admins cannot touch admin rows or grant admin, members may only self-update to leave/rejoin.
- [x] Applied `20261109000000_community_membership_fixes.sql` to the live Supabase instance (2026-11-10). Approve/promote/rejoin still need a live UI pass.
- [x] Typecheck and `node scripts/test_overhaul.js` pass after these changes (2026-11-09).

## Organization membership lifecycle (2026-11-09)

- [x] Added `join_policy` (`open` | `request` | `invite_only`, default `request`) and `member_count` to `organizations`; added `status` (`pending` | `active` | `suspended` | `left`) to `organization_members` while keeping `is_active` in sync (`supabase/migrations/20261109000001_organization_membership.sql`).
- [x] DB guards: join role/status follow `join_policy`, only the creator is seeded as `owner`, self-approval/escalation blocked, leave demotes to `staff`, rejoin allowed from `left`, only owners manage owner rows, owners/admins manage members.
- [x] Accurate `member_count` via `sync_organization_member_count` trigger; existing organizations are backfilled with their `created_by` as `owner` so seeded institutions are manageable.
- [x] New `organizationService` + `useOrganizations` hook: list, detail, members, pending members, my membership, join/leave, status/role mutations.
- [x] New `organization/[id].tsx` detail screen (badges, member roster, website, join/request/cancel/leave/manage) and `organization/manage.tsx` (approve/decline, promote/demote/remove, owner-only owner management).
- [x] Discover organization results now navigate to the detail screen; invite-only organizations are hidden from listings; org cards sort by member count.
- [x] Typecheck and `node scripts/test_overhaul.js` pass after these changes (2026-11-09).
- [x] Applied `20261109000001_organization_membership.sql` to the live Supabase instance (2026-11-10). Request/approve/promote/rejoin still need a live UI pass.
- [ ] Optional follow-up: organization creation flow (new orgs currently require an existing row + owner backfill).

## Automatic travel / current-location refresh (2026-11-09)

- [x] `locationService.refreshCurrentLocation()` silently re-reads the GPS fix, resolves the nearest city/region, and writes the *current* location (never the home location) when the city/region changed or the stored fix is older than 15 minutes.
- [x] Never prompts for permission: it no-ops unless foreground permission is already granted and location services are on.
- [x] Throttled to one automatic GPS read every 2 minutes; a manual Orbit refresh passes `force` to bypass the throttle.
- [x] Orbit refreshes on screen focus, on app resume (foreground), and via the refresh button (now labelled "Refresh Orbit and update location"), then reloads nearby nodes from the new origin.
- [x] Discover's People tab refreshes the current location before querying `find_nearby_users`, so moving to a new city updates nearby people automatically.
- [x] Typecheck and `node scripts/test_overhaul.js` pass after these changes (2026-11-09).
- [ ] Verify on a device: travel to another city (or mock location), reopen Orbit/Discover, and confirm the origin and nearby results update without re-running onboarding.

## Typography scale bump (2026-11-09)

- [x] Raised the type scale to normal mobile defaults: `xs 12`, `sm 14`, `base 16`, `md 18`, `lg 21`, `xl 25`, `2xl 31`, `3xl 37`, with matching line heights (`16/20/24/26/30/34/40/46`) in `src/constants/typography.ts`.
- [x] Added `base` (16) to the lowercase `typography.sizes` alias so screens stop choosing between `sm` (13) and `md` (17) for body text.
- [x] Promoted primary reading content to `base`: home feed post body, feed composer, `PostCard` body, `AnnouncementCard` body, `CommunityCard` description, and notification titles.
- [x] Removed the last hardcoded micro sizes (`9`/`10`/`11`): home welcome/availability/quick captions, Orbit HUD eyebrow/live labels, tab active label, campaign badges, and pinned-announcement badge now use `FontSize.xs`/`typography.sizes.xs`.
- [x] Replaced tight hardcoded line heights (`18`/`19`/`22`) with `LineHeight` tokens on content text (home post body, donation headline, `PostCard`, auth subtitles).
- [x] Verified: `node ./node_modules/typescript/bin/tsc --noEmit --incremental false` and `node scripts/test_overhaul.js` (all five checks) pass (2026-11-09).
- [ ] Device pass: confirm no clipping in the tab pill, fixed-height rows (quick actions, emergency card, donation hero), and single-line badges at the default and large OS font scales.

## Tamale pilot specification (2026-11-10)

- [x] Recorded the pilot spec in `planning.md`: Tamale Teaching Hospital (Tamale, Northern Region) is the first pilot facility.
- [x] Removed the two leftover "Deletion Test Org" rows from the live database (2026-11-10).
- [x] Added Tamale Teaching Hospital as an unclaimed, unverified `hospital` organization in Tamale with no `created_by` (2026-11-10).
- [x] Re-seeded Korle-Bu Blood Bank, Ghana Red Cross, 37 Military Hospital, and Komfo Anokye as unclaimed, unverified organizations with no owner; outside the pilot.
- [x] Created "BloodIn Test Hospital" (verified, Tamale) with a test staff owner who can record and approve cards; added a test donor with card code `BLD-TEST-0001` and demo donation history.
- [x] Confirmed live programme settings: levels 3/6/10/20 and `min_interval_months = 3`.
- [ ] Seed Tamale demo drives/campaigns; the existing seeded campaigns are still in Accra/Kumasi.
- [ ] Implement the admin verification path UI: named staff + hospital proof -> verify hospital -> attach staff + `can_record_donations`.
- [x] Confirmed no application-code changes were needed for the seed; only docs and live data changed.
- [x] Configured `web/.env` from the existing Supabase project and rebuilt the staff site.
- [x] Verified live auth and RPCs: staff/donor password login, `my_approval_organizations`, `lookup_donor_for_card`, `lookup_donor_for_recording`, `recognize_donation`, `organization_donations_today`, `issue_donor_card`, and the same-day duplicate block. The test card was reset afterward so the UI approval flow remains testable.
- [x] Added an env-gated, localhost-only developer trial MFA bypass (`VITE_DEV_SKIP_MFA`) and rebuilt the local preview; the dashboard shows a warning while it is active.
- [ ] Remove `VITE_DEV_SKIP_MFA` from `web/.env` and rebuild before deploying the staff site.
- [ ] Deploy the staff site to a host and verify the public URL.

## Staff portal administration hierarchy (2026-11-11)

- [x] Separate the trusted system-wide administrator (`app_metadata.system_role = system_admin`) from organization-scoped owner/admin/staff roles.
- [x] Add a system-admin portal panel to create health facilities, activate/deactivate facilities, set verification levels, and appoint individual facility owners.
- [x] Add an owner creation Edge Function flow with a one-time temporary password, mandatory first-login password change, and MFA enrollment.
- [x] Allow active facility owners/admins to create staff accounts for active hospitals, blood banks, and NGOs; donation recording remains backend-blocked until facility verification.
- [x] Add organization-scoped one-click staff/admin role changes and an RLS policy constrained by the existing database membership guard.
- [x] Document the one-time trusted system-admin bootstrap and Edge Function deployment in `README.md`.
- [x] Verify staff portal production build, app TypeScript, and existing overhaul tests.
- [ ] Apply the new database migration and deploy the Edge Functions; local Supabase runtime tests are blocked because Docker/Podman is unavailable in this environment.
- [ ] Bootstrap a test system-admin account and exercise facility/owner/staff creation end-to-end before production deployment.
