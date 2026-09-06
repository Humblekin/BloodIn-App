// Project LifeOrbit — Demo Data
// Ghana-flavored seeded content used as a client-side fallback so the app
// feels alive on a fresh install before real community data exists. All ids
// are non-UUID ("demo-*") and are guarded by the existing isDemo checks in the
// UI (write actions like message/connect/join alert instead of hitting the DB).
import type { OrbitNode } from '@/features/orbit/components/OrbitCanvas';
import type { DiscoverResult } from '@/features/discover/services/discoverService';
import type { BloodRequestRow, RequestResponseRow } from '@/features/requests/services/requestService';
import type { PostRow, PostCommentRow } from '@/features/posts/services/postService';
import type { CommunityRow, CommunityMemberRow, AnnouncementRow } from '@/features/communities/services/communityService';
import type { CampaignRow, CampaignParticipantRow } from '@/features/campaigns/services/campaignService';
import type { NotificationRow } from '@/features/notifications/services/notificationService';
import type { ConversationRow, MessageRow } from '@/features/messages/services/messageService';

// ─── Helpers ───────────────────────────────────────────────
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Orbit Nodes (nearby users) ────────────────────────────
export const DEMO_ORBIT_NODES: OrbitNode[] = [
  {
    id: 'demo-user-1',
    type: 'user',
    distance: 2.4,
    angle: 0,
    active: true,
    displayName: 'Ama Mensah',
    bio: 'Nurse at Korle-Bu. O+ donor, passionate about maternal health.',
    bloodGroup: 'O+',
    locationName: 'Accra, Greater Accra',
    isPremium: true,
  },
  {
    id: 'demo-user-2',
    type: 'user',
    distance: 5.1,
    angle: 0,
    active: true,
    displayName: 'Kwame Osei',
    bio: 'Regular blood donor since 2019. 20+ donations and counting.',
    bloodGroup: 'A+',
    locationName: 'Accra, Greater Accra',
  },
  {
    id: 'demo-user-3',
    type: 'user',
    distance: 8.7,
    angle: 0,
    active: true,
    displayName: 'Efua Boateng',
    bio: 'Community health worker, Tamale. B- donor.',
    bloodGroup: 'B-',
    locationName: 'Tamale, Northern',
  },
  {
    id: 'demo-user-4',
    type: 'user',
    distance: 12.3,
    angle: 0,
    active: true,
    displayName: 'Yaw Asante',
    bio: 'Lab technician, AB+ donor and advocate for rare types.',
    bloodGroup: 'AB+',
    locationName: 'Kumasi, Ashanti',
  },
  {
    id: 'demo-user-5',
    type: 'user',
    distance: 15.9,
    angle: 0,
    active: false,
    displayName: 'Akosua Darko',
    bio: 'Student volunteer. Looking to organize a campus drive.',
    bloodGroup: 'O-',
    locationName: 'Kumasi, Ashanti',
  },
  {
    id: 'demo-user-6',
    type: 'user',
    distance: 22.0,
    angle: 0,
    active: false,
    displayName: 'Kofi Owusu',
    bio: 'EMT, always ready to help in an emergency.',
    bloodGroup: 'B+',
    locationName: 'Cape Coast, Central',
  },
];

// ─── Discover Results ──────────────────────────────────────
export const DEMO_DISCOVER: Record<'people' | 'communities' | 'organizations', DiscoverResult[]> = {
  people: [
    { id: 'demo-user-1', type: 'person', name: 'Ama Mensah', subtitle: 'Accra, Greater Accra', distanceKm: 2.4, bloodGroup: 'O+', isVerified: true },
    { id: 'demo-user-2', type: 'person', name: 'Kwame Osei', subtitle: 'Accra, Greater Accra', distanceKm: 5.1, bloodGroup: 'A+', isVerified: true },
    { id: 'demo-user-3', type: 'person', name: 'Efua Boateng', subtitle: 'Tamale, Northern', distanceKm: 8.7, bloodGroup: 'B-' },
    { id: 'demo-user-4', type: 'person', name: 'Yaw Asante', subtitle: 'Kumasi, Ashanti', distanceKm: 12.3, bloodGroup: 'AB+' },
    { id: 'demo-user-5', type: 'person', name: 'Akosua Darko', subtitle: 'Kumasi, Ashanti', distanceKm: 15.9, bloodGroup: 'O-' },
    { id: 'demo-user-6', type: 'person', name: 'Kofi Owusu', subtitle: 'Cape Coast, Central', distanceKm: 22.0, bloodGroup: 'B+' },
  ],
  communities: [
    { id: 'demo-community-1', type: 'community', name: 'Ghana Blood Donors Network', subtitle: '1,204 members', memberCount: 1204, isVerified: true },
    { id: 'demo-community-2', type: 'community', name: 'Accra O+ Donor Circle', subtitle: '486 members', memberCount: 486, isVerified: true },
    { id: 'demo-community-3', type: 'community', name: 'Kumasi Student Volunteers', subtitle: '312 members', memberCount: 312 },
    { id: 'demo-community-4', type: 'community', name: 'Sickle Cell Warriors Support', subtitle: '540 members', memberCount: 540, isVerified: true },
    { id: 'demo-community-5', type: 'community', name: 'Tamale Emergency Responders', subtitle: '178 members', memberCount: 178 },
  ],
  organizations: [
    { id: 'demo-org-1', type: 'organization', name: 'Korle-Bu Teaching Hospital', subtitle: 'hospital', isVerified: true },
    { id: 'demo-org-2', type: 'organization', name: 'National Blood Service Ghana', subtitle: 'blood_bank', isVerified: true },
    { id: 'demo-org-3', type: 'organization', name: 'Komfo Anokye Teaching Hospital', subtitle: 'hospital', isVerified: true },
    { id: 'demo-org-4', type: 'organization', name: 'Red Cross Society Ghana', subtitle: 'ngo', isVerified: true },
    { id: 'demo-org-5', type: 'organization', name: 'Rare Blood Types Initiative', subtitle: 'ngo', isVerified: true },
  ],
};

// ─── Blood Requests ────────────────────────────────────────
const requesterAma = { display_name: 'Ama Mensah', avatar_url: null };
const requesterKwame = { display_name: 'Kwame Osei', avatar_url: null };
const requesterEfua = { display_name: 'Efua Boateng', avatar_url: null };
const requesterYaw = { display_name: 'Yaw Asante', avatar_url: null };

export const DEMO_REQUESTS: BloodRequestRow[] = [
  {
    id: 'demo-request-1',
    requester_id: 'demo-user-1',
    blood_group: 'O-',
    urgency_level: 3,
    title: 'Urgent O- needed for emergency surgery · Korle-Bu Teaching Hospital',
    hospital_name: 'Korle-Bu Teaching Hospital',
    patient_name: 'Baby Adjoa',
    units_required: 3,
    contact_number: '+233 20 123 4567',
    additional_notes: 'Emergency surgery requires O- blood urgently. Please contact us if you can help.',
    status: 'active',
    expires_at: daysFromNow(2),
    created_at: hoursAgo(2),
    updated_at: hoursAgo(2),
    requester_profile: requesterAma,
  },
  {
    id: 'demo-request-2',
    requester_id: 'demo-user-2',
    blood_group: 'A+',
    urgency_level: 2,
    title: 'A+ needed for routine transfusion · 37 Military Hospital',
    hospital_name: '37 Military Hospital',
    patient_name: 'Father Michael',
    units_required: 2,
    contact_number: '+233 24 555 0101',
    additional_notes: 'A+ blood needed for a routine transfusion. Any help is appreciated.',
    status: 'active',
    expires_at: daysFromNow(4),
    created_at: hoursAgo(9),
    updated_at: hoursAgo(9),
    requester_profile: requesterKwame,
  },
  {
    id: 'demo-request-3',
    requester_id: 'demo-user-3',
    blood_group: 'B+',
    urgency_level: 1,
    title: 'B+ donors welcome for planned surgery · Tamale Teaching Hospital',
    hospital_name: 'Tamale Teaching Hospital',
    patient_name: 'Madam Hajara',
    units_required: 1,
    contact_number: '+233 26 789 0123',
    additional_notes: 'Planned surgery next week. B+ donors welcome.',
    status: 'active',
    expires_at: daysFromNow(6),
    created_at: hoursAgo(26),
    updated_at: hoursAgo(26),
    requester_profile: requesterEfua,
  },
  {
    id: 'demo-request-4',
    requester_id: 'demo-user-4',
    blood_group: 'AB+',
    urgency_level: 2,
    title: 'Rare AB+ needed — please share · Komfo Anokye Teaching Hospital',
    hospital_name: 'Komfo Anokye Teaching Hospital',
    patient_name: 'Kofi Boateng',
    units_required: 2,
    contact_number: '+233 20 222 3344',
    additional_notes: 'AB+ is rare, please share widely to reach a match.',
    status: 'active',
    expires_at: daysFromNow(3),
    created_at: hoursAgo(30),
    updated_at: hoursAgo(30),
    requester_profile: requesterYaw,
  },
];

export const DEMO_RESPONSES: RequestResponseRow[] = [
  {
    id: 'demo-response-1',
    request_id: 'demo-request-1',
    responder_id: 'demo-user-2',
    status: 'offered',
    message: 'I am O- and willing to donate. I can come to Korle-Bu tomorrow morning.',
    created_at: hoursAgo(1),
    responder_profile: { display_name: 'Kwame Osei', avatar_url: null, blood_group: 'A+' },
  },
  {
    id: 'demo-response-2',
    request_id: 'demo-request-1',
    responder_id: 'demo-user-3',
    status: 'offered',
    message: 'Contact my sister in Accra, she is O- and available today.',
    created_at: hoursAgo(1.5),
    responder_profile: { display_name: 'Efua Boateng', avatar_url: null, blood_group: 'B-' },
  },
];

// ─── Feed Posts ────────────────────────────────────────────
export const DEMO_POSTS: PostRow[] = [
  {
    id: 'demo-post-1',
    author_id: 'demo-user-1',
    purpose: 'connection',
    visibility: 'public',
    content: 'Hello BloodIn family! I am a nurse at Korle-Bu and a regular O+ donor. Happy to help anyone in the Greater Accra area looking for a donor or advice.',
    blood_group: 'O+',
    community_id: null,
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(3),
    updated_at: hoursAgo(3),
    author: { display_name: 'Ama Mensah', avatar_url: null, is_premium: true },
    community: null,
    shared_from: null,
    comment_count: 3,
    reaction_count: 12,
    my_reaction: [],
  },
  {
    id: 'demo-post-2',
    author_id: 'demo-user-2',
    purpose: 'awareness',
    visibility: 'public',
    content: 'Did you know? Blood can only be stored for 42 days, which is why regular donations matter. Book an appointment at the National Blood Service today — it only takes 15 minutes.',
    blood_group: null,
    community_id: null,
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(8),
    updated_at: hoursAgo(8),
    author: { display_name: 'Kwame Osei', avatar_url: null },
    community: null,
    shared_from: null,
    comment_count: 5,
    reaction_count: 28,
    my_reaction: [],
  },
  {
    id: 'demo-post-3',
    author_id: 'demo-user-4',
    purpose: 'assistance',
    visibility: 'public',
    content: 'Urgent: my community needs AB+ donors for a patient at Komfo Anokye. AB+ is rare — please share this post to help us find matches. Any AB+ or even A+/B+ compatible donors, please reach out.',
    blood_group: 'AB+',
    community_id: null,
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(14),
    updated_at: hoursAgo(14),
    author: { display_name: 'Yaw Asante', avatar_url: null },
    community: null,
    shared_from: null,
    comment_count: 8,
    reaction_count: 34,
    my_reaction: [],
  },
  {
    id: 'demo-post-4',
    author_id: 'demo-user-5',
    purpose: 'campaign',
    visibility: 'public',
    content: 'We are organizing a blood donation drive at KNUST campus next Friday. Lunch provided for all donors! Come by and make a difference. Register via the campaigns tab.',
    blood_group: null,
    community_id: 'demo-community-3',
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(40),
    updated_at: hoursAgo(40),
    author: { display_name: 'Akosua Darko', avatar_url: null },
    community: { id: 'demo-community-3', name: 'Kumasi Student Volunteers' },
    shared_from: null,
    comment_count: 4,
    reaction_count: 19,
    my_reaction: [],
  },
  {
    id: 'demo-post-5',
    author_id: 'demo-user-6',
    purpose: 'community',
    visibility: 'public',
    content: 'Great session with the Central Region responders last weekend. We ran a first-aid and blood-safety workshop — photos coming soon. New volunteers are always welcome.',
    blood_group: null,
    community_id: 'demo-community-5',
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(55),
    updated_at: hoursAgo(55),
    author: { display_name: 'Kofi Owusu', avatar_url: null },
    community: { id: 'demo-community-5', name: 'Tamale Emergency Responders' },
    shared_from: null,
    comment_count: 2,
    reaction_count: 9,
    my_reaction: [],
  },
  {
    id: 'demo-post-6',
    author_id: 'demo-user-2',
    purpose: 'community',
    visibility: 'community',
    content: 'Donor tip: drink plenty of water and eat iron-rich foods the day before donating. It makes the whole process smoother for both you and the nurse.',
    blood_group: null,
    community_id: 'demo-community-1',
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
    author: { display_name: 'Kwame Osei', avatar_url: null },
    community: { id: 'demo-community-1', name: 'Ghana Blood Donors Network' },
    shared_from: null,
    comment_count: 4,
    reaction_count: 15,
    my_reaction: [],
  },
  {
    id: 'demo-post-7',
    author_id: 'demo-user-1',
    purpose: 'campaign',
    visibility: 'community',
    content: 'Reminder for members: our Korle-Bu Emergency Blood Drive is coming up in 3 days. If you can donate or share, please mark yourselves as available.',
    blood_group: null,
    community_id: 'demo-community-1',
    shared_from_post_id: null,
    status: 'active',
    created_at: hoursAgo(24),
    updated_at: hoursAgo(24),
    author: { display_name: 'Ama Mensah', avatar_url: null, is_premium: true },
    community: { id: 'demo-community-1', name: 'Ghana Blood Donors Network' },
    shared_from: null,
    comment_count: 6,
    reaction_count: 21,
    my_reaction: [],
  },
];

export const DEMO_COMMENTS: Record<string, PostCommentRow[]> = {
  'demo-post-1': [
    { id: 'demo-comment-1-1', post_id: 'demo-post-1', author_id: 'demo-user-2', content: 'Welcome! Great to have another regular donor in the network.', created_at: hoursAgo(2), author: { display_name: 'Kwame Osei', avatar_url: null } },
    { id: 'demo-comment-1-2', post_id: 'demo-post-1', author_id: 'demo-user-4', content: 'Thanks for your service at Korle-Bu!', created_at: hoursAgo(1), author: { display_name: 'Yaw Asante', avatar_url: null } },
    { id: 'demo-comment-1-3', post_id: 'demo-post-1', author_id: 'demo-user-6', content: 'We should team up for a drive in Accra.', created_at: hoursAgo(0.5), author: { display_name: 'Kofi Owusu', avatar_url: null } },
  ],
  'demo-post-2': [
    { id: 'demo-comment-2-1', post_id: 'demo-post-2', author_id: 'demo-user-1', content: 'This is such an important reminder. 15 minutes really is all it takes.', created_at: hoursAgo(6), author: { display_name: 'Ama Mensah', avatar_url: null } },
  ],
};

// ─── Communities ───────────────────────────────────────────
export const DEMO_COMMUNITIES: CommunityRow[] = [
  {
    id: 'demo-community-1',
    name: 'Ghana Blood Donors Network',
    slug: 'ghana-blood-donors-network',
    description: 'The national community for blood donors across Ghana. Share drives, requests, and stories of giving life.',
    logo_url: null,
    cover_url: null,
    city_id: 1,
    join_policy: 'open',
    is_verified: true,
    is_active: true,
    member_count: 1204,
    created_by: 'demo-user-1',
    created_at: daysFromNow(-30),
  },
  {
    id: 'demo-community-2',
    name: 'Accra O+ Donor Circle',
    slug: 'accra-o-plus-donor-circle',
    description: 'O+ donors in Accra who are ready to step up when someone needs O+ blood. Rapid response focus.',
    logo_url: null,
    cover_url: null,
    city_id: 1,
    join_policy: 'request',
    is_verified: true,
    is_active: true,
    member_count: 486,
    created_by: 'demo-user-2',
    created_at: daysFromNow(-20),
  },
  {
    id: 'demo-community-3',
    name: 'Kumasi Student Volunteers',
    slug: 'kumasi-student-volunteers',
    description: 'University students organizing campus blood drives in the Ashanti region.',
    logo_url: null,
    cover_url: null,
    city_id: 2,
    join_policy: 'open',
    is_verified: false,
    is_active: true,
    member_count: 312,
    created_by: 'demo-user-5',
    created_at: daysFromNow(-15),
  },
];

export const DEMO_ANNOUNCEMENTS: Record<string, AnnouncementRow[]> = {
  'demo-community-1': [
    { id: 'demo-ann-1-1', community_id: 'demo-community-1', author_id: 'demo-user-1', title: 'Welcome to the Network!', content: 'Introduce yourself in the feed and tell us your blood group and region so we can match you faster.', is_pinned: true, created_at: hoursAgo(20), author_profile: { display_name: 'Ama Mensah', avatar_url: null } },
    { id: 'demo-ann-1-2', community_id: 'demo-community-1', author_id: 'demo-user-2', title: 'National Donation Day — March', content: 'Mark your calendars! The National Blood Service is running a country-wide drive all month. Walk-ins welcome.', is_pinned: false, created_at: hoursAgo(72), author_profile: { display_name: 'Kwame Osei', avatar_url: null } },
  ],
  'demo-community-3': [
    { id: 'demo-ann-3-1', community_id: 'demo-community-3', author_id: 'demo-user-5', title: 'Campus Drive — Friday', content: 'KNUST campus drive this Friday, 9am–4pm at the Student Centre. Free lunch for every donor!', is_pinned: true, created_at: hoursAgo(40), author_profile: { display_name: 'Akosua Darko', avatar_url: null } },
  ],
};

export const DEMO_MEMBERS: Record<string, CommunityMemberRow[]> = {
  'demo-community-1': [
    { id: 'demo-member-1', community_id: 'demo-community-1', user_id: 'demo-user-1', role: 'admin', status: 'active', joined_at: daysFromNow(-30), profile: { display_name: 'Ama Mensah', avatar_url: null } },
    { id: 'demo-member-2', community_id: 'demo-community-1', user_id: 'demo-user-2', role: 'moderator', status: 'active', joined_at: daysFromNow(-25), profile: { display_name: 'Kwame Osei', avatar_url: null } },
    { id: 'demo-member-3', community_id: 'demo-community-1', user_id: 'demo-user-3', role: 'member', status: 'active', joined_at: daysFromNow(-18), profile: { display_name: 'Efua Boateng', avatar_url: null } },
    { id: 'demo-member-4', community_id: 'demo-community-1', user_id: 'demo-user-4', role: 'member', status: 'active', joined_at: daysFromNow(-12), profile: { display_name: 'Yaw Asante', avatar_url: null } },
    { id: 'demo-member-5', community_id: 'demo-community-1', user_id: 'demo-user-6', role: 'member', status: 'active', joined_at: daysFromNow(-8), profile: { display_name: 'Kofi Owusu', avatar_url: null } },
  ],
  'demo-community-3': [
    { id: 'demo-member-3-1', community_id: 'demo-community-3', user_id: 'demo-user-5', role: 'admin', status: 'active', joined_at: daysFromNow(-15), profile: { display_name: 'Akosua Darko', avatar_url: null } },
    { id: 'demo-member-3-2', community_id: 'demo-community-3', user_id: 'demo-user-2', role: 'member', status: 'active', joined_at: daysFromNow(-10), profile: { display_name: 'Kwame Osei', avatar_url: null } },
  ],
};

// ─── Campaigns ─────────────────────────────────────────────
export const DEMO_CAMPAIGNS: CampaignRow[] = [
  {
    id: 'demo-campaign-1',
    title: 'Korle-Bu Emergency Blood Drive',
    description: 'Help replenish the blood bank at Korle-Bu Teaching Hospital. All blood types welcome, O- especially needed. Walk-ins accepted.',
    campaign_type: 'donation_drive',
    community_id: 'demo-community-1',
    organization_id: 'demo-org-1',
    created_by: 'demo-user-1',
    start_date: daysFromNow(3),
    end_date: daysFromNow(3),
    venue: 'Korle-Bu Teaching Hospital, Accra',
    cover_image_url: null,
    max_participants: 200,
    status: 'upcoming',
    safety_info: 'Donors must be 18+, weigh at least 50kg, and be in good health.',
    created_at: hoursAgo(10),
  },
  {
    id: 'demo-campaign-2',
    title: 'KNUST Campus Donation Drive',
    description: 'A student-organized drive on campus. Come donate and enjoy free lunch while supporting students and staff in the Ashanti region.',
    campaign_type: 'donation_drive',
    community_id: 'demo-community-3',
    organization_id: null,
    created_by: 'demo-user-5',
    start_date: daysFromNow(7),
    end_date: daysFromNow(7),
    venue: 'KNUST Student Centre, Kumasi',
    cover_image_url: null,
    max_participants: 150,
    status: 'upcoming',
    safety_info: 'Bring a valid ID. Drink plenty of water before donating.',
    created_at: hoursAgo(36),
  },
  {
    id: 'demo-campaign-3',
    title: 'Blood Safety Awareness Week',
    description: 'A week of education on safe donation practices, rare blood types, and how to get involved in your community.',
    campaign_type: 'awareness',
    community_id: 'demo-community-2',
    organization_id: 'demo-org-4',
    created_by: 'demo-user-2',
    start_date: daysFromNow(14),
    end_date: daysFromNow(20),
    venue: 'Online + Regional hubs',
    cover_image_url: null,
    max_participants: null,
    status: 'upcoming',
    safety_info: null,
    created_at: hoursAgo(60),
  },
];

export const DEMO_CAMPAIGN_PARTICIPANTS: Record<string, CampaignParticipantRow[]> = {
  'demo-campaign-1': [
    { id: 'demo-cp-1-1', campaign_id: 'demo-campaign-1', user_id: 'demo-user-2', status: 'registered', registered_at: hoursAgo(6), profile: { display_name: 'Kwame Osei', avatar_url: null } },
    { id: 'demo-cp-1-2', campaign_id: 'demo-campaign-1', user_id: 'demo-user-4', status: 'registered', registered_at: hoursAgo(5), profile: { display_name: 'Yaw Asante', avatar_url: null } },
    { id: 'demo-cp-1-3', campaign_id: 'demo-campaign-1', user_id: 'demo-user-6', status: 'registered', registered_at: hoursAgo(4), profile: { display_name: 'Kofi Owusu', avatar_url: null } },
  ],
};

// ─── Notifications ─────────────────────────────────────────
export const DEMO_NOTIFICATIONS: NotificationRow[] = [
  { id: 'demo-notif-1', user_id: 'demo', type: 'request_response', title: 'Someone offered to help', body: 'Kwame Osei offered to donate to your O- request for Baby Adjoa.', data: { requestId: 'demo-request-1' }, is_read: false, created_at: hoursAgo(1) },
  { id: 'demo-notif-2', user_id: 'demo', type: 'connection_accepted', title: 'Connection accepted', body: 'Ama Mensah accepted your connection request.', data: {}, is_read: false, created_at: hoursAgo(3) },
  { id: 'demo-notif-3', user_id: 'demo', type: 'community_announcement', title: 'New announcement', body: 'Ghana Blood Donors Network posted: "National Donation Day — March".', data: { communityId: 'demo-community-1' }, is_read: true, created_at: hoursAgo(5) },
  { id: 'demo-notif-4', user_id: 'demo', type: 'blood_request', title: 'Urgent O- request nearby', body: 'Baby Adjoa needs O- blood at Korle-Bu Teaching Hospital within 2 days.', data: { requestId: 'demo-request-1' }, is_read: false, created_at: hoursAgo(2) },
  { id: 'demo-notif-5', user_id: 'demo', type: 'campaign_reminder', title: 'Campaign starting soon', body: 'Korle-Bu Emergency Blood Drive begins in 3 days.', data: { campaignId: 'demo-campaign-1' }, is_read: false, created_at: hoursAgo(8) },
];

// ─── Messages ──────────────────────────────────────────────
export const DEMO_CONVERSATIONS: ConversationRow[] = [
  {
    id: 'demo-conv-1',
    type: 'direct',
    created_at: hoursAgo(2),
    last_message_at: hoursAgo(0.3),
    participants: [
      { user_id: 'demo', profile: { display_name: 'You', avatar_url: null } },
      { user_id: 'demo-user-1', profile: { display_name: 'Ama Mensah', avatar_url: null } },
    ],
    last_message: { content: 'Happy to coordinate! I can be there by 9am.', sender_id: 'demo-user-1', created_at: hoursAgo(0.3) },
  },
  {
    id: 'demo-conv-2',
    type: 'direct',
    created_at: hoursAgo(6),
    last_message_at: hoursAgo(2),
    participants: [
      { user_id: 'demo', profile: { display_name: 'You', avatar_url: null } },
      { user_id: 'demo-user-2', profile: { display_name: 'Kwame Osei', avatar_url: null } },
    ],
    last_message: { content: 'Thanks for the heads up on the drive!', sender_id: 'demo-user-2', created_at: hoursAgo(2) },
  },
];

export const DEMO_MESSAGES: Record<string, MessageRow[]> = {
  'demo-conv-1': [
    { id: 'demo-msg-1-1', conversation_id: 'demo-conv-1', sender_id: 'demo-user-1', content: 'Hi! I saw you offered to help with the O- request.', is_system_message: false, created_at: hoursAgo(1.5), sender_profile: { display_name: 'Ama Mensah', avatar_url: null } },
    { id: 'demo-msg-1-2', conversation_id: 'demo-conv-1', sender_id: 'demo', content: 'Yes, happy to help. What time works best at the hospital?', is_system_message: false, created_at: hoursAgo(1), sender_profile: { display_name: 'You', avatar_url: null } },
    { id: 'demo-msg-1-3', conversation_id: 'demo-conv-1', sender_id: 'demo-user-1', content: 'Happy to coordinate! I can be there by 9am.', is_system_message: false, created_at: hoursAgo(0.3), sender_profile: { display_name: 'Ama Mensah', avatar_url: null } },
  ],
  'demo-conv-2': [
    { id: 'demo-msg-2-1', conversation_id: 'demo-conv-2', sender_id: 'demo-user-2', content: 'The KNUST drive is confirmed for next Friday.', is_system_message: false, created_at: hoursAgo(7), sender_profile: { display_name: 'Kwame Osei', avatar_url: null } },
    { id: 'demo-msg-2-2', conversation_id: 'demo-conv-2', sender_id: 'demo', content: 'I will spread the word to my network.', is_system_message: false, created_at: hoursAgo(6.5), sender_profile: { display_name: 'You', avatar_url: null } },
    { id: 'demo-msg-2-3', conversation_id: 'demo-conv-2', sender_id: 'demo-user-2', content: 'Thanks for the heads up on the drive!', is_system_message: false, created_at: hoursAgo(2), sender_profile: { display_name: 'Kwame Osei', avatar_url: null } },
  ],
};
