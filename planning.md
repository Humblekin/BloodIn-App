# Project LifeOrbit / BloodIn — Master Planning & Roadmap

## 1. Executive Summary & Vision
**BloodIn** is a mission-driven blood donation, emergency dispatch, and community networking platform built with React Native (Expo) and Supabase. The goal is to minimize response time in medical emergencies by bridging blood donors, healthcare recipients, and local communities through real-time geospatial discovery ("Orbit"), peer-to-peer messaging, verified campaigns, and community engagement.

---

## 2. Architecture Blueprint

### 2.1 Frontend Stack
- **Framework:** React Native (Expo SDK 57) with `expo-router` (file-based routing)
- **Language:** TypeScript (strict mode)
- **State Management:**
  - Server state: TanStack Query (React Query v5) with caching and optimistic updates
  - Client state: Zustand stores (auth, location, UI)
- **Styling & Animation:** React Native StyleSheet, React Native Reanimated, Skia, Three.js / React Three Fiber for 3D Orbit visualization
- **Forms & Validation:** React Hook Form + Zod
- **Hardware Integrations:** Expo Location (PostGIS tracking), Expo Secure Store (auth tokens), Expo Image Picker

### 2.2 Backend & Data Stack (Supabase)
- **Database:** PostgreSQL with PostGIS extensions for geospatial matching
- **Authentication:** Supabase Auth (JWT with hardware-backed SecureStore)
- **Real-Time:** Supabase Realtime channels for instant messaging, live request updates, and notification pings
- **Security:** Strict Row-Level Security (RLS) on all tables, secure database triggers, and `SECURITY DEFINER` RPCs
- **Storage:** Supabase Storage buckets (e.g. `avatars`) with access control
- **Edge Functions:** Deno-powered serverless functions for payments (Paystack initialization, verification, webhooks)

---

## 3. Core Modules & Feature Breakdown

### Phase 1: Foundation & Authentication
- [x] Expo Router initialization & deep linking
- [x] Secure storage token persistence adapter
- [x] Auth flow: Login, Register, Password Reset, Onboarding
- [x] Profile setup: Blood type, donor eligibility, medical badges, location consent

### Phase 2: Geospatial Discovery & "Orbit"
- [x] PostGIS spatial queries (`find_nearby_users`, `set_user_location`)
- [x] Real device GPS acquisition, horizontal accuracy checks, and permission handling (zero mock fallbacks)
- [x] Ascending geographic distance proximity sorting (closest members in center shell)
- [x] Visual radar Orbit view with in-screen location onboarding and live refresh
- [x] Donation willingness preference (`willing`, `not_willing`, `unspecified`) with willing-only filter
- [x] Privacy controls: Location obfuscation, privacy zones, and visibility settings

### Phase 3: Blood Requests & Dispatch
- [x] Emergency blood request creation with urgency tiers (Critical, Urgent, Routine)
- [x] Blood compatibility matrix matching (A+, A-, B+, B-, AB+, AB-, O+, O-)
- [x] Request lifecycle management (Open, In Progress, Fulfilled, Cancelled)
- [x] Detailed request cards, urgency badges, and shareable links
- [ ] Push notifications to matching donors in immediate radius

### Phase 4: Communities, Campaigns & Drives
- [x] Community creation, member roles (Admin, Moderator, Member)
- [x] Community announcements and blood drive campaigns
- [x] Campaign participation tracking and donation pledges
- [ ] Hospital and blood bank verification badging

### Phase 5: Social Feed & Engagement
- [x] Community post creation with multi-image support
- [x] Reactions, comments, and post sharing
- [x] Feed algorithms: Chronological + Premium author boost
- [x] Moderation tools: In-app reporting, user blocking, automated content filtering

### Phase 6: Direct Messaging & Real-Time Comms
- [x] 1-on-1 private messaging for donor-recipient coordination
- [x] Connection request lifecycle (`pending`, `accepted`, `declined`) with duplicate prevention
- [x] Backend-enforced chat authorization (RLS + `create_direct_conversation` RPC check)
- [x] Read receipts, timestamps, and typing status
- [x] Supabase Realtime websocket subscriptions
- [ ] Media attachments (photos of hospital slips / donation confirmations)

### Phase 7: Monetization & Premium Ecosystem
- [x] Paystack integration via Supabase Edge Functions (`paystack-init`, `paystack-verify`)
- [x] Premium subscription perks: Donor gold badge, orbit priority, feed promotion
- [x] `upgrade_to_premium` secure database RPC
- [ ] In-app receipt history and automated subscription renewal

---

## 4. Immediate Action Items & Priorities

1. **End-to-End Testing:**
   - Verify Supabase live connection using configured credentials.
   - Test authentication flow (signup -> email verification / auto-confirm -> profile creation).
2. **Real-Time & Push Notification Polish:**
   - Configure Expo push notification tokens and Supabase database webhooks.
3. **Edge Functions Deployment:**
   - Verify deployment of `paystack-init`, `paystack-verify`, and `paystack-webhook` to live Supabase instance.
4. **Platform Builds & QA:**
   - Test responsive layout across Web, iOS, and Android.
   - Run linter and typecheck verification continuously.

---

## 5. Security & Maintenance Checklist
- Keep all production and anon keys isolated; never check `.env` into source control.
- Maintain automated GitHub Action keepalive workflow (`.github/workflows/supabase-keepalive.yml`) to prevent Supabase inactivity pausing.
- Audit RLS policies periodically to guarantee zero cross-tenant data leaks.

## 6. BloodIn Mobile Redesign

### Design reference and audit
- The user supplied a detailed three-screen redesign brief on 2026-10-17. The visual target is `assets/images/Screenshot (2).png`, a composite showing home, conversation, and donation screens. Treat it as the visual specification and compare rendered screens against it throughout implementation.
- Existing stack: Expo SDK 57, React Native 0.86, Expo Router, TypeScript, lucide-react-native, React Native StyleSheet, Supabase, and Inter loaded through Expo Fonts.
- Existing primary routes: `src/app/(main)/(tabs)/index.tsx` (home), `src/app/(main)/messages/[id].tsx` (conversation), and `src/app/(main)/requests/[id].tsx` (request coordination details).
- Home already reads active requests and feed posts from services; chat uses message hooks and Supabase Realtime; request details load live records and submit offers. Redesign these surfaces in place and preserve those integrations.
- Existing local imagery: `assets/images/blood_donation_hero.jpg` and `assets/images/blood_donation_care.jpg`; inspect their suitability before choosing placement.
- Current design tokens are in `src/constants/colors.ts`, `spacing.ts`, and `typography.ts`. Existing brand primary is burgundy (`#7A1F2B`), while the supplied brief proposes vivid red (`#F20D19`) and a light neutral interface.

### Screen specifications (textual brief; proportions are provisional)
- **Home:** compact vivid-red greeting/header with real profile avatar and notification action; donation photograph card; pill search/discovery entry; four compact two-column action tiles; live image-led emergency requests; compact white bottom navigation with active red pill.
- **Conversation:** compact contact header with back navigation and real contact identity; white message canvas; incoming pale-gray and outgoing vivid-red bubbles; real timestamps; safe-area-aware composer and keyboard handling; preserve authorization, ordering, and Realtime behavior. Do not imply call/attachment features unless implemented.
- **Request details:** vivid-red upper region and donation image only if appropriate to available local assets; white details surface with real blood group, request, location, and units; existing offer-to-help workflow and safety disclaimer retained. No unsupported statistics or fabricated inventory.
- Measure the three phone mockups rather than browser chrome or gray canvas in the composite. Keep responsive Flexbox and safe areas in the app; refine dimensions and crops by comparing actual captures.

### Implementation milestones
1. Audit current routes, dependencies, assets, docs, and worktree; preserve unrelated edits.
2. Update design tokens and reusable UI only where they support consistency without duplicating working components.
3. Redesign home, conversation, and request detail in place; verify real workflows and states.
4. Extend the visual system to remaining existing screens without removing functionality.
5. Run available tests and type checks; launch the app and capture/compare actual screens when the environment supports it.
6. Record completed screens, tests, known gaps, and the exact next task in `task.md`.
