# BloodIn legal and privacy pack

**Status: working drafts for review; not approved for publication.**

These drafts describe the current BloodIn mobile app and staff portal as
understood from the source code. They are a starting point for the operator and
a Ghana-qualified lawyer, not legal advice, a compliance certification, or a
promise that every described process is already implemented.

## Draft assumptions

- The operator supplied for this draft is **Abdul-Hakim Abdul-Rauf**. Confirm
  the legal form and whether a company or other entity operates BloodIn before
  publication.
- The initial pilot is **Tamale, Ghana**. Confirm the intended service area
  and whether users elsewhere in Ghana may register.
- The supplied contact number is **0599963155**. Confirm it is an appropriate
  and monitored privacy/support contact before publication.
- Users must be at least **18 years old**. Registration now requires an
  18-or-older self-attestation; that is not independent age verification.
- The code uses Supabase for authentication, database, storage, and Edge
  Functions; Paystack for payment checkout/verification; and device/browser
  location services through Expo. The exact Supabase hosting region,
  subprocessors, authentication email-delivery provider, and production
  payment configuration depend on account settings and must be verified.
- The app stores location coordinates, supports blood-group and donor
  information, and includes messages, voice notes, community content, and
  facility staff tools. A privacy setting is available for profile discovery,
  blood group, location visibility, and messaging.
- No retention schedule, self-service account deletion flow, or legal-policy
  acceptance/version-recording flow was identified in the current app source.
  A contact number has been supplied, but its monitoring and response process
  are unconfirmed.

## Before publication or production use

1. Have Ghana-qualified counsel review the documents against the Data
   Protection Act, 2012 (Act 843), applicable health-sector rules, consumer
   and electronic-commerce rules, and BloodIn's real operating model.
2. Confirm the legal operator, address, privacy contact, service area, policy
   effective date, and how users can contact the operator.
3. Confirm DPC registration requirements and status. The Ghana Data Protection
   Commission says data controllers and processors must register:
   <https://dpc.gov.gh/registration>.
4. Verify Supabase project region and subprocessors, the email-delivery
   configuration, Paystack data flows, app-store distribution, and any
   analytics, crash-reporting, advertising, or other SDKs in production.
5. Set and implement retention periods for accounts, requests, messages, voice
   media, donation records, payment records, reports, audit logs, backups, and
   deleted-account data. The current database preserves some shared messages,
   reports, and audit history after account deletion, with the user's link
   removed; deletion is not necessarily erasure of every contribution.
6. Test the 18+ self-attestation gate. It is not independent age verification.
7. Decide how privacy requests, complaints, correction, access, objection,
   consent withdrawal, and account deletion are received, identity-checked,
   tracked, and fulfilled. Confirm that the supplied phone is monitored and
   establish a response process.
8. After legal review, add versioned in-app access to the approved documents
   and record affirmative acceptance of the Terms and Privacy Notice. Do not
   ask users to accept these drafts as final policies.
9. Confirm the exact Premium features, whether the GHS 20.00 price is
   one-time, refund/cancellation terms, and the legal treatment of each
   organization and staff member's access to health-related information.
10. Maintain working incident response, access control, staff training,
    backup/deletion, and vendor-management procedures. A notice cannot replace
    these operational controls.

## Files in this pack

- [Privacy Notice](./privacy-notice.md)
- [Terms of Use](./terms-of-use.md)
- [Community and Safety Rules](./community-and-safety-rules.md)
- [Facility and Staff Data-Handling Schedule](./facility-data-schedule.md)

The DPC's public site describes its role under Act 843 and registration and
compliance expectations: <https://dpc.gov.gh/>. Confirm current legal
requirements directly with the Commission and qualified counsel.
