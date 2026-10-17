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
