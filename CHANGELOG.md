# Changelog

## Unreleased

- Added the locally bundled, red-accented unDraw Social Friends illustration to the existing welcome screen.
- Began documenting the BloodIn mobile redesign brief and its current implementation status.
- Audited the existing Expo routes and confirmed that home, messaging, and request detail already use live feature services.
- Located and inspected `assets/images/Screenshot (2).png` as the visual target for all three priority screens.
- Began the screenshot-led home redesign while preserving live requests, availability, navigation, and Discover filtering.
- Recorded that browser preview currently redirects unauthenticated sessions to Welcome, so private-screen screenshot comparison requires a valid authenticated session.
- Added password recovery: deep-link callback handling (`authCallback.ts`), root-layout routing to the reset screen, and send/reset flows in `reset-password.tsx`.
- Added the Donation Programme: opt-in donor card with unique member code + QR and a recognition ledger, backed by `join_donation_programme` / `leave_donation_programme` / `recognize_donation` RPCs and `profile/donate.tsx`.
- Fixed an ambiguous column reference in the donation RPCs and removed a debug `console.error` that surfaced a dev RedBox on native.
- Hardened security by sanitizing credentials, patching dependencies, and enforcing mutation ownership.
- Verified `node scripts/test_overhaul.js` (five checks) and direct `tsc --noEmit` on 2026-11-09.
- Added community member management: approve/decline pending join requests, promote/demote roles, and remove members from the Manage screen (admins and moderators).
- Fixed rejoining after leaving, allowed pending members to withdraw a request, and surfaced a pending-approval state on the community screen.
- Hid invite-only communities from public listings and made `member_count` accurate through a database trigger and backfill.
- Added database guards so join status/role follow `join_policy` and members cannot self-approve or escalate their own role (`20261109000000_community_membership_fixes.sql`).
- Added the organization membership lifecycle: `join_policy`/`member_count` on organizations, pending/active status on members, owner/admin/staff guards, and creator-owner backfill (`20261109000001_organization_membership.sql`).
- Added `organizationService`/`useOrganizations`, an organization detail screen, and a manage screen for approving requests and managing roles; Discover organization results now open the detail screen and hide invite-only orgs.
- Added automatic current-location refresh (`refreshCurrentLocation`) so moving to another city updates the Orbit/Discover origin without re-running onboarding; it is throttled, never prompts for permission, and never overwrites the home location.
- Orbit now refreshes location on focus, on app resume, and from the refresh button; Discover's People tab refreshes before nearby queries.
- Raised the typography scale to normal mobile defaults (body 16, secondary 14, captions 12) and updated line heights; added `base` to the `typography.sizes` alias.
- Promoted feed, post, announcement, community-description, and notification body text to 16px, removed the remaining 9/10px hardcoded sizes, and replaced tight hardcoded line heights with `LineHeight` tokens.
- Applied all pending Supabase migrations to the live project: community/organization membership, health-worker donation recording, donor special card, voice notes and request chat, request contact privacy, donation interval, and card-approval helpers.
- Documented the Tamale pilot: Tamale Teaching Hospital (unclaimed, unverified) is the first pilot facility; other seeded institutions stay unclaimed and outside the pilot; "BloodIn Test Hospital" with test staff is reserved for development and demos.
- Removed the two leftover "Deletion Test Org" rows from the live database.
- Seeded the Tamale pilot: Tamale Teaching Hospital (unclaimed, unverified), Korle-Bu Blood Bank, Ghana Red Cross, 37 Military Hospital, and Komfo Anokye (all unclaimed/unverified), plus BloodIn Test Hospital (verified, Tamale) with a test staff owner and a test donor (`BLD-TEST-0001`, O+, Tamale) with demo donation history.
- Configured `web/.env`, rebuilt the staff site, and started a local preview at `http://127.0.0.1:4173`.
- Verified live Auth/REST flows: staff and donor password login, `my_approval_organizations`, `lookup_donor_for_card`, `lookup_donor_for_recording`, `recognize_donation`, `organization_donations_today`, `issue_donor_card`, and the same-day duplicate block; the test card was reset afterward.
- Test accounts use the reserved `.test` email domain and must be removed or disabled before real launch.
- Added an env-gated, localhost-only developer trial MFA bypass (`VITE_DEV_SKIP_MFA`) to the staff site; the local `web/.env` enables it and the dashboard shows a warning. Production builds must omit the flag and rebuild.
- Added system-admin facility management: add health facilities, activate/deactivate them, set verification level, and create facility-owner accounts with one-time temporary credentials.
- Added facility-owner staff provisioning and one-click staff/admin role changes scoped to that organization; unverified facilities can be configured but cannot record donations.
- Added trusted `system_role=system_admin` bootstrap guidance and deployment notes for the system-admin Edge Function and first-login password/MFA flow.
