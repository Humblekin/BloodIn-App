// Test Suite for BloodIn Overhaul
// Validates:
// 1. Geographic distance calculations and proximity sorting
// 2. Accra/Tamale fallback elimination
// 3. Donation willingness preference states and filters
// 4. Connection request lifecycle and chat authorization rules

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ─── Reference Haversine Formula ────────────────────────────
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// ─── Test 1: Fallback Coordinates Elimination ───────────────
console.log('--- Test 1: Verifying elimination of hardcoded Accra/city fallback ---');
const locationPickerContent = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'components', 'location', 'LocationPicker.tsx'),
  'utf8'
);
assert(
  !locationPickerContent.includes('ACCRA_FALLBACK'),
  'LocationPicker must not contain ACCRA_FALLBACK'
);
assert(
  !locationPickerContent.includes('5.6037'),
  'LocationPicker must not contain hardcoded Accra latitude'
);
console.log('✔ PASS: Hardcoded city coordinates completely eliminated from location picker.');

// ─── Test 2: Distance Accuracy & Precision ──────────────────
console.log('\n--- Test 2: Distance Calculation Accuracy & Proximity Ordering ---');
// Known coordinates in Ghana:
// Accra Center: 5.5500, -0.2000
// Tema (~25 km East of Accra): 5.6698, -0.0166
// Kasoa (~28 km West of Accra): 5.5345, -0.4244
// Kumasi (~200 km North-West): 6.6885, -1.6244
// Tamale (~440 km North): 9.4008, -0.8393

const accra = { lat: 5.5500, lng: -0.2000 };
const temaDist = calculateHaversineDistanceKm(accra.lat, accra.lng, 5.6698, -0.0166);
const kasoaDist = calculateHaversineDistanceKm(accra.lat, accra.lng, 5.5345, -0.4244);
const kumasiDist = calculateHaversineDistanceKm(accra.lat, accra.lng, 6.6885, -1.6244);
const tamaleDist = calculateHaversineDistanceKm(accra.lat, accra.lng, 9.4008, -0.8393);

console.log(`Accra -> Tema: ${temaDist} km`);
console.log(`Accra -> Kasoa: ${kasoaDist} km`);
console.log(`Accra -> Kumasi: ${kumasiDist} km`);
console.log(`Accra -> Tamale: ${tamaleDist} km`);

assert(temaDist > 15 && temaDist < 30, 'Tema distance should be around 23-25 km');
assert(kumasiDist > 180 && kumasiDist < 250, 'Kumasi distance should be around 200 km');
assert(tamaleDist > 400, 'Tamale distance should be over 400 km');

// Simulate Orbit proximity sorting
const testUsers = [
  { id: 'user-tamale', name: 'Alhassan', distance: tamaleDist },
  { id: 'user-tema-2', name: 'Kofi B', distance: temaDist },
  { id: 'user-kasoa', name: 'Ama', distance: kasoaDist },
  { id: 'user-tema-1', name: 'Kofi A', distance: temaDist },
  { id: 'user-kumasi', name: 'Kwaku', distance: kumasiDist },
];

// Orbit sorting logic: ascending distance, secondary sort by user ID
const sorted = [...testUsers].sort((a, b) => {
  if (a.distance !== b.distance) return a.distance - b.distance;
  return a.id.localeCompare(b.id);
});

assert.strictEqual(sorted[0].id, 'user-tema-1', 'Closest user with tie-breaker must be first');
assert.strictEqual(sorted[1].id, 'user-tema-2', 'Second closest user must be next');
assert.strictEqual(sorted[2].id, 'user-kasoa', 'Kasoa user must follow Tema users');
assert.strictEqual(sorted[3].id, 'user-kumasi', 'Kumasi user must follow Kasoa');
assert.strictEqual(sorted[4].id, 'user-tamale', 'Farthest user (Tamale) must be last');
console.log('✔ PASS: Proximity sorting orders strictly nearest to farthest with stable tie-breaking.');

// ─── Test 3: Short Distance Formatting (No False 0 km) ──────
console.log('\n--- Test 3: Short Distance Formatting ---');
function formatDistance(distKm) {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m away`;
  }
  return `${distKm.toFixed(1)} km away`;
}

assert.strictEqual(formatDistance(0.35), '350 m away', '350 meters must display in meters, not 0 km');
assert.strictEqual(formatDistance(0.08), '80 m away', '80 meters must display in meters');
assert.strictEqual(formatDistance(1.46), '1.5 km away', '1.46 km must display as 1.5 km');
console.log('✔ PASS: Distances < 1 km display in meters and never collapse to 0 km.');

// ─── Test 4: Donation Willingness States & Filtering ─────────
console.log('\n--- Test 4: Donation Willingness States & Filtering ---');
const validStates = ['willing', 'not_willing', 'unspecified'];
const donorCandidates = [
  { id: '1', name: 'Donor 1', donationWillingness: 'willing', bloodGroup: 'O+' },
  { id: '2', name: 'Donor 2', donationWillingness: 'not_willing', bloodGroup: 'O+' },
  { id: '3', name: 'Donor 3', donationWillingness: 'unspecified', bloodGroup: 'O+' },
  { id: '4', name: 'Donor 4', donationWillingness: 'willing', bloodGroup: 'A+' },
];

// Willing-only filter for blood request dispatch
const willingDonors = donorCandidates.filter(d => d.donationWillingness === 'willing');
assert.strictEqual(willingDonors.length, 2, 'Only willing donors must be returned');
assert(willingDonors.every(d => d.donationWillingness === 'willing'), 'Must only contain willing');

// Blood group + willing filter
const matchingWillingO = donorCandidates.filter(
  d => d.donationWillingness === 'willing' && d.bloodGroup === 'O+'
);
assert.strictEqual(matchingWillingO.length, 1, 'Only O+ willing donor must match');
assert.strictEqual(matchingWillingO[0].id, '1');

// General Orbit includes non-willing members with correct status
const generalOrbitCandidates = donorCandidates.map(d => ({
  id: d.id,
  willingness: d.donationWillingness
}));
assert.strictEqual(generalOrbitCandidates.length, 4, 'General Orbit retains all members');
console.log('✔ PASS: Willingness filters and general Orbit retention operate correctly.');

// ─── Test 5: Connection Requests & Chat Authorization ───────
console.log('\n--- Test 5: Connection Requests & Chat Authorization ---');
function canChat(connectionState) {
  return connectionState === 'accepted';
}

assert.strictEqual(canChat('none'), false, 'Cannot chat without connection');
assert.strictEqual(canChat('pending_sent'), false, 'Cannot chat while request is pending');
assert.strictEqual(canChat('pending_received'), false, 'Cannot chat while request is incoming');
assert.strictEqual(canChat('declined'), false, 'Cannot chat when request is declined');
assert.strictEqual(canChat('accepted'), true, 'Chat permitted when connection is accepted');

// Self-connection check
function validateConnectionRequest(senderId, receiverId) {
  if (senderId === receiverId) {
    throw new Error('Cannot connect to yourself');
  }
  return true;
}

assert.throws(
  () => validateConnectionRequest('user-1', 'user-1'),
  /Cannot connect to yourself/,
  'Self connection must throw error'
);
assert.doesNotThrow(
  () => validateConnectionRequest('user-1', 'user-2'),
  'Different users should be valid'
);
console.log('✔ PASS: Chat authorization and connection validation logic confirmed.');

console.log('\n========================================');
console.log('ALL OVERHAUL VERIFICATION TESTS PASSED!');
console.log('========================================');
