export type LegalDocumentKey = 'terms' | 'privacy';

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, { title: string; content: string }> = {
  terms: {
    title: 'Terms of Use',
    content: `# BloodIn Terms of Use

**DRAFT - NOT READY TO PUBLISH**

- **Operator:** Abdul-Hakim Abdul-Rauf [confirm legal form]
- **Initial pilot:** Tamale, Ghana
- **Effective date:** [insert date after legal review]
- **Support contact:** 0599963155 [confirm monitoring and availability]

These draft Terms apply to the BloodIn mobile app and staff portal. They need review by a Ghana-qualified lawyer and must be matched to the production features, fees, policies, and complaint process before publication.

## 1. Accepting these Terms
The final app must show the approved Terms and Privacy Notice and record which versions a user accepted. The current sign-up checkboxes acknowledge the 18-and-over age requirement and that BloodIn is not a medical-services provider; signup does not currently record acceptance of these draft Terms or the Privacy Notice.

## 2. Who may use BloodIn
You must be at least **18 years old** to create or use an account. Do not use BloodIn if you are under 18. Registration requires you to confirm that you are at least 18, but this self-attestation is not independent age verification.

Provide accurate information, keep it current, and protect your credentials. You are responsible for activity through your account unless applicable law provides otherwise. Do not share access or impersonate another person.

## 3. What BloodIn is - and is not
BloodIn is a coordination platform that helps users and health-related organizations communicate about blood donation needs. BloodIn does not:

- provide medical advice, diagnosis, treatment, blood testing, screening, transfusion, or emergency response;
- determine whether a person is medically eligible to donate;
- certify that a donor, request, facility, blood supply, or medical claim is accurate or safe; or
- guarantee that a donor, blood product, facility, response, or outcome will be available.

For medical decisions, eligibility, screening, and transfusion, use a qualified health professional and an appropriate licensed facility. In an emergency, contact local emergency services or a hospital directly; do not rely on BloodIn.

## 4. Donation safety and prohibited transactions
Blood must not be bought or sold through BloodIn. You must not request, offer, arrange, or facilitate payment or other commercial exchange for blood. The app's Premium payment, if offered, is payment for the stated digital features only and never for blood, donors, medical treatment, or priority access to a donation.

All donation decisions and procedures must take place through qualified medical professionals and appropriate facilities. Users must not treat a profile, blood-group label, donor card, location match, or prior donation record as a substitute for clinical checks.

## 5. User content and conduct
You are responsible for information and content you submit, including profiles, location, requests, responses, posts, comments, messages, voice notes, and images. You must have the right and authority to provide it. Do not submit another person's health, contact, or location information without their authority or a lawful basis.

You must not:

- post false, deceptive, or unauthorized blood requests or impersonate a patient, donor, health worker, or organization;
- buy or sell blood, solicit payment for donation, or run a related scam;
- harass, threaten, discriminate against, exploit, or intimidate another person;
- publish another person's private or sensitive information without authority;
- use BloodIn to unlawfully access, collect, export, or misuse information;
- upload malware, interfere with the service, or evade access controls; or
- use BloodIn for unlawful, unsafe, or unrelated commercial purposes.

See the Community and Safety Rules for additional requirements.

## 6. Messages, requests, and privacy choices
BloodIn provides tools to create requests, respond to requests, exchange text and voice messages, and participate in communities. A request may disclose information to other users. Contact details attached to a request are available to the requester and users who respond to that request, subject to the current database rules. Review your content before posting.

Privacy settings can limit some profile visibility, discovery, location detail, and messaging. They cannot control screenshots, copying, or disclosures by recipients outside BloodIn. Do not rely on a privacy setting to conceal information you cannot safely share.

## 7. Organizations and staff
Organization owners and administrators are responsible for selecting authorized staff and assigning appropriate access. Staff must use access only for their authorized duties, protect credentials, and keep donor or request information confidential. Do not access records out of curiosity or share them outside an authorized workflow.

Organizations must comply with applicable health, privacy, employment, and recordkeeping requirements. The parties must sign or accept the final Facility and Staff Data-Handling Schedule before using organization workflows with real personal or health information. The legal roles and responsibilities of BloodIn and each organization must be determined for the actual processing, not assumed from job titles.

## 8. Premium features and payments
If a paid feature is offered, the app must display its features, total price, currency, whether payment is one-time or recurring, and applicable refund or cancellation terms before payment. The current code displays a Premium price of **GHS 20.00** and uses Paystack for payment initialization and verification. Confirm the live price, Premium benefits, and whether it is one-time before publishing these Terms. Paystack may process payment information under its own terms and privacy notice.

## 9. Moderation, suspension, and closure
We may review reports and take proportionate action where permitted by law, including removing content, restricting features, suspending accounts, or referring serious safety or legal matters to appropriate authorities. We do not promise continuous monitoring or an immediate response to every report. Use the in-app reporting/blocking tools where available and contact **0599963155** for platform safety concerns. This is not an emergency response line.

You may stop using BloodIn. For account deletion, contact **0599963155** until a self-service process is implemented. Deletion may not remove every shared, safety, legal, or audit record; see the Privacy Notice.

## 10. Service changes and responsibility
We may change, suspend, or discontinue features for safety, legal, or operational reasons. The final version of these Terms must explain available remedies and limitations in a manner permitted by Ghanaian law. Nothing in these Terms excludes liability or a right that cannot legally be excluded. Have counsel draft the final limitation, indemnity, dispute, and consumer protection wording; no blanket waiver is intended by this draft.

## 11. Governing law and changes
These draft Terms are intended for a Ghana-based pilot and are subject to review of the governing-law and dispute-resolution provisions by Ghanaian counsel. We will identify the effective date and communicate material changes as required by law.

Questions or complaints: **0599963155**. A postal address, monitored availability, and response process still need to be confirmed before publication.`,
  },
  privacy: {
    title: 'Privacy Notice',
    content: `# BloodIn Privacy Notice

**DRAFT - NOT READY TO PUBLISH**

- **Proposed operator:** Abdul-Hakim Abdul-Rauf [confirm legal form]
- **Initial pilot:** Tamale, Ghana
- **Effective date:** [insert date after legal review]
- **Privacy/support contact:** 0599963155 [confirm monitoring and availability]
- **Data Protection Officer/contact:** [insert if applicable]

This Notice explains how the operator of BloodIn ("BloodIn", "we", "us") uses personal information in the BloodIn mobile application and staff portal. It is a draft based on the current code, not legal advice. Do not publish it until the placeholders, actual production configuration, retention rules, and legal review are complete.

## 1. What BloodIn does
BloodIn helps people, donors, and health-related organizations connect about blood donation needs. It is a coordination platform. It is not a hospital, blood bank, medical practitioner, emergency service, or substitute for professional medical advice, screening, diagnosis, treatment, or transfusion services.

## 2. Information we handle
Depending on how you use BloodIn, we may handle:

- **Account and profile information:** email address, display name, profile details, profile image, account identifiers, and authentication information. Supabase Auth handles passwords; BloodIn's application code does not receive or store a user's plaintext password.
- **Blood and donation-related information:** blood group, donation willingness/availability, blood requests and responses, donation acknowledgements or records, donor-card information, and related facility records. This can reveal information about a person's health and must be treated as sensitive.
- **Location information:** when you grant foreground location permission, BloodIn can obtain device coordinates, resolve a nearby city/region, and store current coordinates and locality information for nearby matching. The app can refresh a saved current location while relevant screens are used. Nearby features can calculate and display approximate distance. Location visibility settings control what location detail other users can see; they do not mean BloodIn itself stops processing location needed for the feature.
- **Requests and communications:** request descriptions, contact numbers supplied with requests, responses, text messages, voice-note media and metadata, and information needed to deliver in-app notifications. Request contact numbers are restricted in the database to the requester and people who respond to that request. Voice notes are stored in a private storage bucket and are intended to be accessible to conversation participants.
- **Community and safety information:** posts, comments, community participation, reports, blocks, and moderation or audit records.
- **Organization and workforce information:** facility details, staff account and membership information, role/permission assignments, and donation records handled through authorized facility workflows.
- **Payment information:** premium transaction reference, amount, currency, and transaction status. Checkout is initiated with Paystack. Payment card details are entered with Paystack, not directly into BloodIn's app code. Paystack's own terms and privacy notice also apply to its processing.
- **Technical and security information:** authentication/session data, service requests, and security or operational records generated by the services used to operate the app. The exact logs and retention periods depend on production configuration.

BloodIn's current sign-up form does not ask for a date of birth or independently verify age. It collects an email address, display name, and password and asks users to confirm they are at least 18 and acknowledge that BloodIn is not a medical-services provider.

## 3. Why we use information
Subject to applicable Ghanaian law, we use information to:

- create and secure accounts and provide BloodIn features;
- show relevant donors, requests, organizations, and approximate proximity;
- facilitate donation coordination and communications;
- maintain user privacy preferences and deliver requested in-app notifications;
- operate organization and staff workflows, including authorized donation recording;
- process and verify premium purchases;
- prevent fraud, abuse, unsafe conduct, and unauthorized access;
- respond to support, privacy, safety, and legal requests; and
- meet applicable legal obligations and protect the rights and safety of users and others.

We will identify and document the lawful grounds and, where required, obtain valid consent for sensitive personal information before production use. Consent can be withdrawn where consent is the applicable ground; withdrawal does not undo processing that was lawful before withdrawal.

## 4. How information may be shared
We may make information available:

- to other BloodIn users according to the feature, your privacy settings, and the information you choose to post or send;
- to requesters and people who respond to their blood requests, including request contact information as described above;
- to authorized owners, administrators, and staff of an organization for organization workflows, subject to their permissions and applicable law;
- to Supabase, which provides the configured authentication, database, storage, and Edge Function infrastructure;
- to Paystack to initiate and verify payments;
- to device operating systems and browser location services when you use location-enabled features;
- to vendors needed to operate the service, once identified and disclosed in the production vendor list; and
- where required by law, valid legal process, or an urgent need to protect someone from serious harm, subject to applicable law.

The exact Supabase hosting region, subprocessors, email-delivery provider, and international transfer destinations have not been verified for this draft. They must be confirmed from the production accounts before this Notice is published. We do not claim that BloodIn uses end-to-end encrypted messaging.

## 5. Visibility and your controls
The app currently provides settings for blood-group visibility, location visibility, who may message you, discovery and Orbit visibility, and several notification preferences. You can also block users. These controls affect specified app features; they do not remove information already shared with another person, copied outside BloodIn, or retained where required for safety, legal, or operational reasons.

Profile avatars are stored in a public Supabase Storage bucket. Do not upload an image that you are not comfortable being accessible by its public URL. Voice notes use a private bucket with participant access policies.

## 6. Retention and deletion
BloodIn has not yet set a complete, published retention schedule. We will retain information only for as long as a documented purpose and applicable law require, and then delete or de-identify it where appropriate. Exact periods for each record type must be decided and implemented before publication.

The current database deletion design does not erase every shared record when an account is removed. Some messages, request responses, shared organization records, reports, moderation records, and audit history can remain with the former user's identity link set to null; other related data may be removed through database cascades. Backups and vendor logs may have separate deletion cycles. This description must be reconciled with production behavior.

The current app source does not identify a self-service account deletion feature. Until a tested process is available, contact **0599963155** to request account deletion or exercise a privacy right. We will verify the request and explain any information we must retain and why. Replace this temporary instruction with a tested process and response timeframe before publication.

## 7. Your choices and rights
Subject to applicable law, you may ask to access or correct information about you, request deletion or restriction, object to certain uses, withdraw consent, or raise a concern about our handling of your information. Contact **0599963155**. We may need to verify your identity and may ask for details needed to locate the relevant records.

You may also contact the Ghana Data Protection Commission: https://dpc.gov.gh/. The operator must confirm its registration and all applicable duties under the Data Protection Act, 2012 (Act 843), before launch.

## 8. Security
We use technical and organizational safeguards appropriate to the service, including authenticated access controls. No online service can guarantee absolute security. We do not claim that all messages or data are end-to-end-encrypted. The operator must maintain and test access reviews, incident response, backup, staff training, and vendor security procedures.

If you believe your account or information has been accessed improperly, contact **0599963155** promptly.

## 9. Children and age requirement
BloodIn is intended only for people aged **18 or older**. Registration requires an 18-or-older self-attestation, but this is not independent age verification. If we learn that an underage person has provided information, contact **0599963155**.

## 10. Changes and contact
We will publish the effective date and explain material changes before they take effect where required. Contact the operator at **0599963155** with questions, requests, or complaints. A postal address and monitored service availability still need to be confirmed before publication.`,
  },
};
