// Hardcoded (config-driven) document structure for B2B onboarding.
// These documents are NOT seeded to the database — they are rendered directly
// from this config. Uploads are matched by `documentKey`.
// After these predefined docs, any extra fields added by B2B-OPS / Super-Admin
// (stored in DB) are appended.

export interface B2BDocumentConfigField {
  documentKey: string;
  documentName: string;
  section: 'Business Registration' | 'Tax & Financial' | 'KYC Documents' | 'Authorized Signatory';
  required: boolean;
  helpText?: string;
  order: number;
}

export const B2B_DOCUMENTS_CONFIG: B2BDocumentConfigField[] = [
  // ── Business Registration ──────────────────────────────────────────────
  {
    documentKey: 'registration_certificate',
    documentName: 'Registration Certificate',
    section: 'Business Registration',
    required: true,
    helpText: 'Company/business registration certificate',
    order: 1,
  },
  {
    documentKey: 'gst_certificate',
    documentName: 'GST Registration Certificate',
    section: 'Business Registration',
    required: false,
    helpText: 'GST registration certificate (if applicable)',
    order: 2,
  },
  {
    documentKey: 'shop_establishment_license',
    documentName: 'Shop & Establishment License',
    section: 'Business Registration',
    required: false,
    helpText: 'If applicable',
    order: 3,
  },
  {
    documentKey: 'partnership_deed',
    documentName: 'Partnership Deed',
    section: 'Business Registration',
    required: false,
    helpText: 'If applicable (Partnership firms)',
    order: 4,
  },
  // ── Tax & Financial ────────────────────────────────────────────────────
  {
    documentKey: 'pan_card_company',
    documentName: 'PAN Card (Company)',
    section: 'Tax & Financial',
    required: true,
    helpText: 'Company PAN card',
    order: 5,
  },
  {
    documentKey: 'cancelled_cheque',
    documentName: 'Cancelled Cheque / Bank Proof',
    section: 'Tax & Financial',
    required: true,
    helpText: 'Cancelled cheque or bank statement as proof',
    order: 6,
  },
  {
    documentKey: 'tan_document',
    documentName: 'TAN Document',
    section: 'Tax & Financial',
    required: true,
    helpText: 'TAN allotment document',
    order: 7,
  },
  {
    documentKey: 'gst_document',
    documentName: 'GST Document',
    section: 'Tax & Financial',
    required: true,
    helpText: 'GST certificate or GST proof document',
    order: 8,
  },
  // ── KYC Documents ─────────────────────────────────────────────────────
  {
    documentKey: 'aadhaar_card',
    documentName: 'Aadhaar Card',
    section: 'KYC Documents',
    required: true,
    helpText: 'Individual / Authorized Signatory Aadhaar card',
    order: 9,
  },
  {
    documentKey: 'pan_card_individual',
    documentName: 'PAN Card (Individual)',
    section: 'KYC Documents',
    required: true,
    helpText: 'Individual PAN card',
    order: 10,
  },
  {
    documentKey: 'passport_photo',
    documentName: 'Passport-size Photograph',
    section: 'KYC Documents',
    required: true,
    helpText: 'Recent passport-size photograph',
    order: 11,
  },
  {
    documentKey: 'address_proof',
    documentName: 'Address Proof',
    section: 'KYC Documents',
    required: true,
    helpText: 'Electricity bill / Rent agreement / Bank statement',
    order: 12,
  },
  // ── Authorized Signatory ───────────────────────────────────────────────
  {
    documentKey: 'auth_id_proof',
    documentName: 'ID Proof (Authorized Person)',
    section: 'Authorized Signatory',
    required: true,
    helpText: 'ID proof of the authorized signatory',
    order: 13,
  },
  {
    documentKey: 'board_resolution',
    documentName: 'Board Resolution / Authorization Letter',
    section: 'Authorized Signatory',
    required: true,
    helpText: 'Board resolution or authorization letter',
    order: 14,
  },
  {
    documentKey: 'digital_signature',
    documentName: 'Digital Signature (DSC)',
    section: 'Authorized Signatory',
    required: false,
    helpText: 'Digital Signature Certificate (if required for contracts)',
    order: 15,
  },
];

// Set of all predefined document keys (for filtering DB-only extras)
export const PREDEFINED_DOC_KEYS = new Set(B2B_DOCUMENTS_CONFIG.map(d => d.documentKey));

export const B2B_DOC_SECTION_ORDER: B2BDocumentConfigField['section'][] = [
  'Business Registration',
  'Tax & Financial',
  'KYC Documents',
  'Authorized Signatory',
];
