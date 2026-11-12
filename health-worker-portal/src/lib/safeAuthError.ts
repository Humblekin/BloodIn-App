const NETWORK_ERROR_MESSAGE =
  'Could not connect to BloodIn. Check your internet connection and try again.';
const GENERIC_AUTH_ERROR_MESSAGE = 'Unable to sign in right now. Please try again.';

export function getSafeSignInErrorMessage(error: unknown): string {
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message
      : '';
  const normalized = message.toLowerCase();

  if (
    /https?:\/\/|\.supabase\.(co|in)|supabase url/.test(normalized) ||
    /network request failed|failed to fetch|fetch failed|networkerror|network error|load failed|offline|timed out|timeout|connection refused/.test(
      normalized
    )
  ) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (normalized.includes('too many requests')) {
    return 'Too many sign-in attempts. Please wait and try again.';
  }

  return GENERIC_AUTH_ERROR_MESSAGE;
}
