// BloodIn — Auth deep-link callback processing
// Central place that interprets the URL Supabase sends back after a password
// recovery or e-mail confirmation link is tapped.
//
// Supabase can return two callback formats depending on the configured flow:
//   1. PKCE:    <redirect>?code=...(&redirect_type=recovery)
//   2. Implicit: <redirect>#access_token=...&refresh_token=...&type=recovery
// Both are handled here. Error callbacks arrive as ?error= / ?error_code= /
// ?error_description= (query) or the same keys in the URL fragment.
//
// SECURITY: this module must never log the raw callback URL — it can contain
// authorization codes, access tokens or refresh tokens.

import { createURL } from 'expo-linking';
import { supabase } from '@/lib/supabase/client';

/**
 * Redirect URLs used in Supabase Auth requests.
 *
 * BOTH URLs must be allowlisted in the Supabase dashboard under
 * Authentication → URL Configuration → Redirect URLs, otherwise Supabase
 * falls back to the project Site URL (often http://localhost:3000) and the
 * link opens a dead development server. See docs/supabase-auth-setup.md.
 */
export const RECOVERY_REDIRECT_URL = createURL('reset-password', { scheme: 'bloodin' });
export const CONFIRM_REDIRECT_URL = createURL('auth/callback', { scheme: 'bloodin' });

export type AuthCallbackKind = 'recovery' | 'confirmation' | 'error' | 'none';

export interface AuthCallbackResult {
  /** True when the URL belongs to a BloodIn auth flow. */
  handled: boolean;
  kind: AuthCallbackKind;
  /** User-facing sentence when kind === 'error'. Never contains tokens. */
  message?: string;
}

// Deduplicate concurrent/duplicate deliveries of the same callback URL so an
// authorization code is never exchanged twice.
const processedCallbacks = new Map<string, Promise<AuthCallbackResult>>();

/** Path portion of a URL, scheme and query/fragment stripped. */
function pathOf(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? '';
  return withoutQuery.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
}

/** True for password-recovery callbacks (bloodin://reset-password...). */
export function isRecoveryCallbackUrl(url: string): boolean {
  if (!url) return false;
  if (/(?:^|\/)reset-password$/.test(pathOf(url))) return true;
  const { query, fragment } = parseCallbackParams(url);
  return (
    query.get('redirect_type') === 'recovery' ||
    query.get('type') === 'recovery' ||
    fragment.get('type') === 'recovery'
  );
}

/** True for e-mail confirmation callbacks (bloodin://auth/callback...). */
export function isConfirmationCallbackUrl(url: string): boolean {
  if (!url) return false;
  return /(?:^|\/)auth\/callback$/.test(pathOf(url));
}

/** True when the URL carries any auth payload or targets one of our auth routes. */
export function isAuthCallbackUrl(url: string): boolean {
  if (!url) return false;
  if (isRecoveryCallbackUrl(url) || isConfirmationCallbackUrl(url)) return true;
  const { query, fragment } = parseCallbackParams(url);
  return Boolean(
    query.get('code') ||
      fragment.get('code') ||
      query.get('access_token') ||
      fragment.get('access_token') ||
      query.get('error') ||
      fragment.get('error')
  );
}

function parseCallbackParams(url: string): { query: URLSearchParams; fragment: URLSearchParams } {
  const [withoutFragment, fragmentPart = ''] = url.split('#', 2);
  const query = new URLSearchParams(withoutFragment.split('?')[1] ?? '');
  const fragment = new URLSearchParams(fragmentPart);
  return { query, fragment };
}

/**
 * Maps raw Supabase/GoTrue error codes and descriptions to stable, friendly
 * sentences. Raw descriptions are intentionally not echoed back to the UI.
 */
export function describeAuthCallbackError(
  code?: string | null,
  description?: string | null
): string {
  const haystack = `${code ?? ''} ${description ?? ''}`.toLowerCase();

  if (
    haystack.includes('verifier') ||
    haystack.includes('code challenge') ||
    haystack.includes('code_challenge')
  ) {
    return 'This link can only be used on the device where the reset was requested. Request a new link on this device.';
  }
  if (haystack.includes('expired')) {
    return 'This link has expired or was already used. Request a new link and try again.';
  }
  if (haystack.includes('cancel')) {
    return 'The request was cancelled.';
  }
  if (haystack.includes('invalid') || haystack.includes('bad_')) {
    return 'This link is invalid. Request a new link and try again.';
  }
  if ((code ?? '').toLowerCase() === 'access_denied') {
    return 'This link is invalid or has expired. Request a new link and try again.';
  }
  return 'The link could not be processed. Request a new link and try again.';
}

/**
 * Processes a Supabase auth callback URL exactly once.
 *
 * - PKCE `code` is exchanged via exchangeCodeForSession.
 * - Implicit `#access_token`/`#refresh_token` pairs are applied via setSession.
 * - Recovery is detected from the destination path and/or `type`/`redirect_type`.
 * - Invalid, expired or cancelled links resolve to kind 'error' with a friendly
 *   message; URLs without any auth payload resolve to kind 'none'.
 */
export function processAuthCallbackUrl(url: string): Promise<AuthCallbackResult> {
  const existing = processedCallbacks.get(url);
  if (existing) return existing;

  const task = processCallback(url);
  // Cache successful processing for the app lifetime so late duplicate
  // deliveries can never re-run a one-time code exchange. Failures are
  // dropped so they are not sticky (a fresh link produces a fresh URL anyway).
  void task.then((result) => {
    if (result.kind === 'error') processedCallbacks.delete(url);
  });
  processedCallbacks.set(url, task);
  return task;
}

async function processCallback(url: string): Promise<AuthCallbackResult> {
  try {
    const { query, fragment } = parseCallbackParams(url);
    const recovery = isRecoveryCallbackUrl(url);

    const errorCode = query.get('error_code') ?? fragment.get('error_code');
    const error = query.get('error') ?? fragment.get('error');
    const errorDescription =
      query.get('error_description') ?? fragment.get('error_description');

    if (error || errorCode) {
      return {
        handled: true,
        kind: 'error',
        message: describeAuthCallbackError(errorCode ?? error, errorDescription),
      };
    }

    // PKCE flow
    const code = query.get('code') ?? fragment.get('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        return {
          handled: true,
          kind: 'error',
          message: describeAuthCallbackError(
            (exchangeError as { code?: string }).code,
            exchangeError.message
          ),
        };
      }
      return { handled: true, kind: recovery ? 'recovery' : 'confirmation' };
    }

    // Implicit flow
    const accessToken = query.get('access_token') ?? fragment.get('access_token');
    const refreshToken = query.get('refresh_token') ?? fragment.get('refresh_token');
    if (accessToken || refreshToken) {
      if (!accessToken || !refreshToken) {
        return {
          handled: true,
          kind: 'error',
          message: describeAuthCallbackError('invalid', 'incomplete session payload'),
        };
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        return {
          handled: true,
          kind: 'error',
          message: describeAuthCallbackError(
            (sessionError as { code?: string }).code,
            sessionError.message
          ),
        };
      }
      const type = query.get('type') ?? fragment.get('type');
      return {
        handled: true,
        kind: recovery || type === 'recovery' ? 'recovery' : 'confirmation',
      };
    }

    // No auth payload — plain navigation into one of our auth routes.
    return {
      handled: recovery || isConfirmationCallbackUrl(url),
      kind: 'none',
    };
  } catch {
    // Never include the URL or exception details (may embed tokens).
    return {
      handled: true,
      kind: 'error',
      message: describeAuthCallbackError('unknown', 'processing failed'),
    };
  }
}
