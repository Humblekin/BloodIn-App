// Project LifeOrbit — Safety Text Constants
// All safety warnings, disclaimers, and notices centralized here.
// These are displayed at critical touchpoints throughout the app.

export const SafetyTexts = {
  // ─── Registration ───────────────────────────────────────
  registration: {
    title: 'Important Information',
    body: 'BloodIn is a platform that connects individuals, blood donation communities, and organizations. ' +
      'It does not medically certify blood, guarantee donor eligibility, or replace qualified healthcare professionals.\n\n' +
      'By creating an account, you acknowledge that all blood donation and transfusion decisions must involve ' +
      'appropriate medical screening, testing, and professional oversight.',
    acknowledgement: 'I understand that BloodIn is a connection platform and does not provide medical services.',
  },

  // ─── Before Creating a Blood Request ────────────────────
  requestCreation: {
    title: 'Safety Notice',
    body: 'Before creating a blood request, please ensure:\n\n' +
      '• The request is associated with a legitimate medical need.\n' +
      '• Blood donation should only take place at authorized medical facilities.\n' +
      '• All donors must be screened by qualified medical professionals.\n' +
      '• Blood must be properly tested, collected, stored, and handled.\n\n' +
      'BloodIn helps connect potential donors — it does not guarantee donor eligibility or blood compatibility.',
    acknowledgement: 'I understand and will ensure proper medical oversight.',
  },

  // ─── Before Responding to a Request ─────────────────────
  requestResponse: {
    title: 'Before You Respond',
    body: 'By responding to this request, you are indicating your willingness to be contacted as a potential donor.\n\n' +
      'Important:\n' +
      '• You are not committing to donate — you are expressing willingness to help.\n' +
      '• Final eligibility must be determined by medical professionals.\n' +
      '• Never donate blood without proper medical screening.\n' +
      '• Donation should only take place at authorized medical facilities.',
    acknowledgement: 'I understand that responding does not constitute a medical commitment.',
  },

  // ─── In Conversations (Banner) ──────────────────────────
  conversationSafety: {
    title: 'Safety Reminder',
    body: 'Never share sensitive personal information in messages. ' +
      'Blood donation should only take place at authorized medical facilities with proper screening.',
  },

  // ─── Profile Blood Group ───────────────────────────────
  bloodGroupNotice:
    'Your blood group is displayed for connection purposes only. ' +
    'It does not confirm your medical eligibility to donate blood.',

  // ─── Verification Clarification ─────────────────────────
  verificationNotices: {
    human: 'Human Verified means this account has passed basic trust checks. ' +
      'It does NOT mean the user is medically verified to donate blood.',
    identity: 'Identity Verified means this user has completed an identity verification process. ' +
      'It does NOT confirm medical eligibility.',
    community: 'Community Verified means this community has completed the platform\'s verification process.',
    organization: 'Organization Verified means this organization has been verified by the platform.',
    premium: 'Premium is a subscription status. It does NOT indicate any form of medical, ' +
      'identity, or organizational verification.',
  },

  // ─── General Platform Disclaimer ────────────────────────
  platformDisclaimer:
    'Matching blood groups does not guarantee medical compatibility or safety. ' +
    'Blood must be appropriately tested, screened, collected, stored, and handled. ' +
    'Final eligibility and compatibility decisions must be made by qualified healthcare professionals.',

  // ─── Safety Center ─────────────────────────────────────
  safetyCenter: {
    title: 'Safety Center',
    sections: [
      {
        title: 'About BloodIn',
        body: 'BloodIn connects individuals, blood donation communities, and organizations. ' +
          'We help people find potential donors and coordinate blood donation activities.',
      },
      {
        title: 'What We Are NOT',
        body: 'BloodIn is not a medical service. We do not:\n' +
          '• Certify blood or donors\n' +
          '• Guarantee blood compatibility\n' +
          '• Replace medical professionals\n' +
          '• Conduct medical screening\n' +
          '• Store or transport blood',
      },
      {
        title: 'Safe Blood Donation',
        body: 'Blood donation should always:\n' +
          '• Take place at authorized medical facilities\n' +
          '• Involve proper medical screening of donors\n' +
          '• Include blood testing and cross-matching\n' +
          '• Follow proper collection and storage procedures\n' +
          '• Be overseen by qualified healthcare professionals',
      },
      {
        title: 'Your Privacy',
        body: 'You control your information. You can choose what to share, ' +
          'who can see it, and how you can be contacted. ' +
          'Your exact location is never publicly exposed.',
      },
      {
        title: 'Reporting Concerns',
        body: 'If you encounter suspicious activity, fake requests, harassment, or any ' +
          'content that concerns you, please report it immediately using the report function.',
      },
    ],
  },
} as const;
