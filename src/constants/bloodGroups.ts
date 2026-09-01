// Project LifeOrbit — Blood Group Definitions
// All supported blood group types with metadata.

export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
] as const;

export type BloodGroup = typeof BLOOD_GROUPS[number];

// Blood group display information
export const BloodGroupInfo: Record<BloodGroup, {
  label: string;
  fullName: string;
  canDonateTo: BloodGroup[];
  canReceiveFrom: BloodGroup[];
}> = {
  'A+': {
    label: 'A+',
    fullName: 'A Positive',
    canDonateTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
  },
  'A-': {
    label: 'A−',
    fullName: 'A Negative',
    canDonateTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['A-', 'O-'],
  },
  'B+': {
    label: 'B+',
    fullName: 'B Positive',
    canDonateTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
  },
  'B-': {
    label: 'B−',
    fullName: 'B Negative',
    canDonateTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['B-', 'O-'],
  },
  'AB+': {
    label: 'AB+',
    fullName: 'AB Positive',
    canDonateTo: ['AB+'],
    canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  'AB-': {
    label: 'AB−',
    fullName: 'AB Negative',
    canDonateTo: ['AB+', 'AB-'],
    canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'],
  },
  'O+': {
    label: 'O+',
    fullName: 'O Positive',
    canDonateTo: ['A+', 'B+', 'AB+', 'O+'],
    canReceiveFrom: ['O+', 'O-'],
  },
  'O-': {
    label: 'O−',
    fullName: 'O Negative',
    canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    canReceiveFrom: ['O-'],
  },
};

// Compatibility note: this is for informational purposes only.
// The app must never declare medical compatibility.
export const COMPATIBILITY_DISCLAIMER =
  'Blood group compatibility information is provided for general educational purposes only. ' +
  'Actual transfusion compatibility must be determined by qualified medical professionals ' +
  'through proper cross-matching and testing procedures.';
