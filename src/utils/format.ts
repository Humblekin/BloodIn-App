// Project LifeOrbit — Formatting Utilities
// Pure utility functions for display formatting.

/**
 * Format a date string to a human-readable relative time.
 * e.g., "2 minutes ago", "3 hours ago", "Yesterday"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format a date string to a readable date.
 * e.g., "Aug 31, 2026"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string to a readable time.
 * e.g., "10:30 AM"
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format approximate distance for display.
 * Never shows exact coordinates — only human-readable distance.
 */
export function formatDistance(km: number): string {
  if (km < 1) return 'Less than 1 km';
  if (km < 10) return `~${Math.round(km)} km`;
  if (km < 100) return `~${Math.round(km / 5) * 5} km`;
  return `~${Math.round(km / 10) * 10} km`;
}

/**
 * Format a location hierarchy for display.
 * e.g., "Accra, Greater Accra, Ghana"
 */
export function formatLocation(parts: {
  cityName?: string | null;
  regionName?: string | null;
  countryName?: string | null;
}): string {
  const segments = [parts.cityName, parts.regionName, parts.countryName].filter(Boolean);
  return segments.join(', ') || 'Location not set';
}

/**
 * Format a display name with proper casing.
 */
export function formatDisplayName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

/**
 * Format member count for display.
 * e.g., "1,234 members", "12.5K members"
 */
export function formatMemberCount(count: number): string {
  if (count < 1000) return `${count} member${count !== 1 ? 's' : ''}`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}K members`;
  return `${Math.round(count / 1000)}K members`;
}

/**
 * Format urgency level for display.
 */
export function formatUrgency(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'Critical';
    case 'urgent': return 'Urgent';
    case 'normal': return 'Normal';
    default: return urgency;
  }
}
