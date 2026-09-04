// Project LifeOrbit — Posts Feature Constants
import type { PostPurpose, PostReactionType } from '@/types/common';

export const POST_PURPOSES: { value: PostPurpose; label: string; hint: string }[] = [
  { value: 'connection', label: 'Connect', hint: 'Introduce yourself to the network' },
  { value: 'assistance', label: 'Ask for help', hint: 'A blood need or support request' },
  { value: 'awareness', label: 'Raise awareness', hint: 'Share knowledge or updates' },
  { value: 'community', label: 'Community post', hint: 'Something for your community' },
  { value: 'campaign', label: 'Campaign', hint: 'Promote a drive or event' },
  { value: 'organization', label: 'Organization', hint: 'An organization update' },
];

export const POST_PURPOSE_LABEL: Record<PostPurpose, string> = Object.fromEntries(
  POST_PURPOSES.map((p) => [p.value, p.label])
) as Record<PostPurpose, string>;

export const POST_VISIBILITIES: { value: 'public' | 'connections' | 'community' | 'private'; label: string }[] = [
  { value: 'public', label: 'Everyone' },
  { value: 'connections', label: 'My connections' },
  { value: 'community', label: 'My community' },
  { value: 'private', label: 'Only me' },
];

export const POST_REACTIONS: { value: PostReactionType; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'helpful', label: 'Helpful' },
  { value: 'interested', label: 'Interested' },
];

export const MAX_POST_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 1000;

// Shown on assistance posts. Non-repetitive and distinct from the request
// disclaimer: it focuses on the fact that a stated blood group is not a
// medical certification.
export const ASSISTANCE_SAFETY_TEXT = {
  title: 'Stay safe',
  body: 'Stated blood groups are not a certification of medical eligibility. Never pay for blood, never request payment, and arrange any donation or screening through a certified facility.',
};