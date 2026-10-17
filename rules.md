# Project Rules & Guidelines — BloodIn

## 1. Security & Credential Protection (CRITICAL)
- **Zero Exposure Policy:** Never output secret API keys, service role tokens, or private credentials in chat responses, terminal outputs, or commit messages.
- **Git Security:**
  - The `.env` file and any `.env*.local` files must strictly remain gitignored at all times.
  - Always run `git status` and inspect staged changes prior to any commit to ensure no secrets or sensitive configuration files are tracked.
  - If a secret or sensitive credential is provided in conversation, securely write it directly into `.env` without echoing it back in plain text in the chat.
- **Client vs. Server Keys:**
  - Only use `EXPO_PUBLIC_SUPABASE_ANON_KEY` in mobile/client-facing code.
  - Never embed `SERVICE_ROLE_KEY` or `PAYSTACK_SECRET_KEY` in React Native / Expo client code. Sensitive logic belongs in Supabase Edge Functions.

---

## 2. Code Quality & Standards
- **TypeScript:** Strict type checking must be adhered to. Avoid using `any`; define robust interfaces and types in `src/types/`.
- **Architecture:**
  - File-based routing with Expo Router (`src/app/`).
  - Business logic, data fetching, and mutations structured inside dedicated services and TanStack Query hooks.
  - UI state and lightweight global state managed through Zustand stores.
  - Styling with standard React Native StyleSheet or modern inline styling patterns consistent with the project.
- **Error Handling:** Always catch and log network/database errors gracefully with user-friendly toast/alert feedback.

---

## 3. Git & Development Workflow
- **Branching & Commits:** Use clear, conventional commit messages (e.g., `feat:`, `fix:`, `refactor:`, `chore:`).
- **Verification:** Ensure TypeScript passes (`npx tsc --noEmit`) and Expo boots without syntax/module errors before pushing code.
- **Task Tracking:** Keep `task.md` up to date as tasks and phases are completed.

## 4. BloodIn Redesign Requirements
- Preserve the existing Expo Router architecture, authentication, Supabase services, database schema, Realtime behavior, and Row Level Security while changing presentation.
- Use real profile and request data. Never fabricate donor availability, blood inventory, hospital verification, or messages.
- Retain functional loading, empty, error, offline, keyboard, and safe-area states on redesigned screens.
- Use local image assets where suitable; do not reference nonexistent files or represent generic imagery as an authentic BloodIn photograph.
- Use the existing icon and component libraries before adding dependencies. Keep touch targets accessible and layouts responsive.
- The supplied brief requests vivid red (`#F20D19`) and light neutrals, but visual fidelity cannot be validated until its referenced screenshot is available. Document estimates and limitations honestly.
- Do not overwrite or revert pre-existing worktree changes. Check `git status` before and after edits.
- Update `task.md` with actual implementation and verification status; never mark a check complete based only on intended behavior or source inspection.
