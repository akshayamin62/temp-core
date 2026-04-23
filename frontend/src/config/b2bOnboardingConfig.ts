// ─── B2B Onboarding Form Configuration ───────────────────────────────────────
// Defines all sections, form fields, and document fields for the comprehensive
// B2B onboarding form used by Admin and Advisor.

export type FieldType = 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'readonly' | 'checkbox';

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];      // for select type
  hint?: string;
  pattern?: string;        // for validation
  maxLength?: number;
  minLength?: number;
  conditionalOn?: string;  // key of another field
  conditionalValue?: string;
  conditionalValues?: string[];
}

export interface DocumentSeedField {
  documentName: string;
  documentKey: string;
  section: string;
  required: boolean;
  helpText?: string;
  order: number;
}

export interface FormSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  fields: FormField[];
  documentFields?: DocumentSeedField[];  // document upload fields within this section
}

// ─── Default document fields that are auto-seeded on backend ─────────────────
// This mirrors backend's DEFAULT_DOCUMENT_FIELDS for UI organization purposes.
export const DOCUMENT_SECTION_KEYS: Record<string, DocumentSeedField[]> = {
  'Business Registration': [
    { documentName: 'Registration Certificate', documentKey: 'registration_certificate', section: 'Business Registration', required: true, helpText: 'Company/business registration certificate', order: 1 },
    { documentName: 'GST Registration Certificate', documentKey: 'gst_certificate', section: 'Business Registration', required: false, helpText: 'GST registration certificate (if applicable)', order: 2 },
    { documentName: 'Shop & Establishment License', documentKey: 'shop_establishment_license', section: 'Business Registration', required: false, helpText: 'If applicable', order: 3 },
    { documentName: 'Partnership Deed', documentKey: 'partnership_deed', section: 'Business Registration', required: false, helpText: 'If applicable (Partnership firms)', order: 4 },
  ],
  'Tax & Financial': [
    { documentName: 'PAN Card (Company)', documentKey: 'pan_card_company', section: 'Tax & Financial', required: true, helpText: 'Company PAN card', order: 5 },
    { documentName: 'Cancelled Cheque / Bank Proof', documentKey: 'cancelled_cheque', section: 'Tax & Financial', required: true, helpText: 'Cancelled cheque or bank statement as proof', order: 6 },
    { documentName: 'Latest ITR', documentKey: 'latest_itr', section: 'Tax & Financial', required: false, helpText: 'Latest Income Tax Return (optional but recommended)', order: 7 },
  ],
  'KYC Documents': [
    { documentName: 'Aadhaar Card', documentKey: 'aadhaar_card', section: 'KYC Documents', required: true, helpText: 'Individual / Authorized Signatory Aadhaar card', order: 8 },
    { documentName: 'PAN Card (Individual)', documentKey: 'pan_card_individual', section: 'KYC Documents', required: true, helpText: 'Individual PAN card', order: 9 },
    { documentName: 'Passport-size Photograph', documentKey: 'passport_photo', section: 'KYC Documents', required: true, helpText: 'Recent passport-size photograph', order: 10 },
    { documentName: 'Address Proof', documentKey: 'address_proof', section: 'KYC Documents', required: true, helpText: 'Electricity bill / Rent agreement / Bank statement', order: 11 },
  ],
  'Authorized Signatory': [
    { documentName: 'ID Proof (Authorized Person)', documentKey: 'auth_id_proof', section: 'Authorized Signatory', required: true, helpText: 'ID proof of the authorized signatory', order: 12 },
    { documentName: 'Board Resolution / Authorization Letter', documentKey: 'board_resolution', section: 'Authorized Signatory', required: true, helpText: 'Board resolution or authorization letter', order: 13 },
    { documentName: 'Digital Signature (DSC)', documentKey: 'digital_signature', section: 'Authorized Signatory', required: false, helpText: 'Digital Signature Certificate (if required for contracts)', order: 14 },
  ],
};

export const LEGAL_ENTITY_TYPES = [
  'Proprietorship',
  'Partnership',
  'LLP (Limited Liability Partnership)',
  'Pvt Ltd (Private Limited Company)',
  'Public Limited Company',
  'Trust',
  'Society',
  'Other',
];

export const B2B_FORM_SECTIONS: FormSection[] = [
  // ─── Section 1: Basic Identity & Contact Details ──────────────────────────
  {
    id: 'basic_identity',
    title: 'Basic Identity & Contact Details',
    icon: 'user',
    description: '',
    fields: [
      { key: 'firstName', label: 'First Name', type: 'readonly', required: true },
      { key: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'Middle name (optional)' },
      { key: 'lastName', label: 'Last Name', type: 'readonly', required: true },
      { key: 'designation', label: 'Designation', type: 'text', required: true, placeholder: 'e.g. Director, Managing Partner', maxLength: 100 },
      { key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Registered company name', maxLength: 200 },
      { key: 'primaryMobile', label: 'Primary Mobile Number', type: 'readonly', required: true },
      { key: 'alternateMobile', label: 'Alternate Mobile Number', type: 'tel', placeholder: '10-digit mobile number (optional)', pattern: '^[6-9]\\d{9}$' },
      { key: 'email', label: 'Personal Email', type: 'readonly', required: true },
      { key: 'officeAddress', label: 'Office Address', type: 'textarea', required: true, placeholder: 'Complete office address', maxLength: 500 },
      { key: 'registeredAddress', label: 'Registered Address', type: 'textarea', required: true, placeholder: 'Complete registered address', maxLength: 500 },
      { key: 'sameAsOfficeAddress', label: 'Same as Office Address', type: 'checkbox' },
      { key: 'country', label: 'Country', type: 'select', required: true },
      { key: 'state', label: 'State', type: 'select', required: true },
      { key: 'city', label: 'City', type: 'select', required: true },
      { key: 'pinCode', label: 'PIN Code', type: 'text', required: true, placeholder: '6-digit PIN code', pattern: '^\\d{6}$', hint: 'Enter 6-digit PIN code' },
    ],
  },

  // ─── Section 2: Business Registration Details ─────────────────────────────
  {
    id: 'business_registration',
    title: 'Business Registration Details',
    icon: 'building',
    description: 'Legal registration details and certificates of the business entity.',
    fields: [
      {
        key: 'legalEntityType', label: 'Legal Entity Type', type: 'select', required: true,
        options: LEGAL_ENTITY_TYPES,
        placeholder: 'Select entity type',
      },
      { key: 'cin', label: 'CIN (Company Identification Number)', type: 'text', placeholder: 'For Pvt Ltd companies', hint: 'Required for Private Limited Companies', conditionalOn: 'legalEntityType', conditionalValue: 'Pvt Ltd (Private Limited Company)' },
      { key: 'llpin', label: 'LLPIN', type: 'text', placeholder: 'For LLP entities', hint: 'Required for LLP entities', conditionalOn: 'legalEntityType', conditionalValue: 'LLP (Limited Liability Partnership)' },
      { key: 'udyamNumber', label: 'UDYAM Number', type: 'text', required: true, placeholder: 'e.g. UDYAM-MH-12-1234567', hint: 'Required for Proprietorship and Partnership entities (e.g. UDYAM-MH-12-1234567)', conditionalOn: 'legalEntityType', conditionalValues: ['Proprietorship', 'Partnership'] },
      { key: 'trustRegistrationNumber', label: 'Trust Registration Number', type: 'text', required: true, placeholder: 'e.g. E/12345/Mumbai', hint: 'Required for Trust entities (e.g. E/12345/Mumbai)', conditionalOn: 'legalEntityType', conditionalValue: 'Trust' },
      { key: 'gstNumber', label: 'GST Number', type: 'text', placeholder: 'e.g. 22AAAAA0000A1Z5', pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', hint: 'Valid 15-character GST number', maxLength: 15 },
    ],
    documentFields: DOCUMENT_SECTION_KEYS['Business Registration'],
  },

  // ─── Section 3: Tax & Financial Details ──────────────────────────────────
  {
    id: 'tax_financial',
    title: 'Tax & Financial Details',
    icon: 'currency',
    description: 'Tax identification numbers and banking details for payment and compliance.',
    fields: [
      { key: 'panIndividual', label: 'PAN Card (Individual)', type: 'text', required: true, placeholder: 'e.g. ABCDE1234F', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', hint: '10-character PAN number', maxLength: 10 },
      { key: 'panCompany', label: 'PAN Card (Company)', type: 'text', required: true, placeholder: 'e.g. ABCDE1234F', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', hint: '10-character company PAN number', maxLength: 10 },
      { key: 'tan', label: 'TAN (Tax Deduction Account Number)', type: 'text', placeholder: 'e.g. MUMC03164F (if applicable)', maxLength: 10 },
      { key: 'bankAccountName', label: 'Bank Account Name', type: 'text', required: true, placeholder: 'As per bank records', maxLength: 200 },
      { key: 'accountType', label: 'Account Type', type: 'select', required: true, options: ['Saving', 'Current'], placeholder: 'Select account type' },
      { key: 'bankAccountNumber', label: 'Bank Account Number', type: 'text', required: true, placeholder: 'Account number', pattern: '^\\d{9,18}$', hint: '9-18 digit account number', maxLength: 18 },
      { key: 'ifscCode', label: 'IFSC Code', type: 'text', required: true, placeholder: 'e.g. HDFC0001234', pattern: '^[A-Z]{4}0[A-Z0-9]{6}$', hint: '11-character IFSC code', maxLength: 11 },
    ],
    documentFields: DOCUMENT_SECTION_KEYS['Tax & Financial'],
  },

  // ─── Section 4: Company Details ───────────────────────────────────────────
  {
    id: 'company_details',
    title: 'Company Details',
    icon: 'office',
    description: 'Official company contact details.',
    fields: [
      { key: 'companyOfficialName', label: 'Company Name', type: 'text', required: true, placeholder: 'Official company name', maxLength: 200 },
      { key: 'companyMobile', label: 'Company Mobile Number', type: 'tel', required: true, placeholder: '10-digit mobile', pattern: '^[6-9]\\d{9}$' },
      { key: 'officialEmail', label: 'Official Email', type: 'email', required: true, placeholder: 'company@example.com' },
      { key: 'companyOfficeAddress', label: 'Company Office Address', type: 'textarea', required: true, placeholder: 'Complete office address', maxLength: 500 },
      { key: 'companyCountry', label: 'Country', type: 'select', required: true },
      { key: 'companyState', label: 'State', type: 'select', required: true },
      { key: 'companyCity', label: 'City', type: 'select', required: true },
      { key: 'companyPinCode', label: 'PIN Code', type: 'text', required: true, placeholder: '6-digit PIN code', pattern: '^\\d{6}$', maxLength: 6 },
      { key: 'website', label: 'Website URL', type: 'text', placeholder: 'https://www.example.com', pattern: '^https?:\\/\\/.+', maxLength: 300 },
      { key: 'socialMediaLinks', label: 'Social Media Links', type: 'textarea', placeholder: 'LinkedIn, Facebook, Instagram URLs (one per line)', maxLength: 500 },
    ],
  },

  // ─── Section 5: Point of Contact (POC) Details ───────────────────────────
  {
    id: 'poc_details',
    title: 'Point of Contact (POC) Details',
    icon: 'contact',
    description: 'POC (Point of Contact) details for day-to-day communication and coordination.',
    fields: [
      { key: 'pocFirstName', label: 'First Name', type: 'text', required: true, placeholder: 'POC first name', maxLength: 100 },
      { key: 'pocMiddleName', label: 'Middle Name', type: 'text', placeholder: 'Middle name (optional)', maxLength: 100 },
      { key: 'pocLastName', label: 'Last Name', type: 'text', required: true, placeholder: 'POC last name', maxLength: 100 },
      { key: 'pocDesignation', label: 'Designation', type: 'text', required: true, placeholder: 'e.g. Business Development Manager', maxLength: 100 },
      { key: 'pocMobile', label: 'Mobile Number', type: 'tel', required: true, placeholder: '10-digit mobile', pattern: '^[6-9]\\d{9}$' },
      { key: 'pocEmail', label: 'Email', type: 'email', required: true, placeholder: 'poc@example.com' },
    ],
  },

  // ─── Section 6: Escalation Matrix Details ────────────────────────────────
  {
    id: 'escalation_matrix',
    title: 'Escalation Matrix Details',
    icon: 'escalation',
    description: 'This must be different from the POC details.',
    fields: [
      { key: 'escFirstName', label: 'First Name', type: 'text', required: true, placeholder: 'Escalation contact first name', maxLength: 100 },
      { key: 'escMiddleName', label: 'Middle Name', type: 'text', placeholder: 'Middle name (optional)', maxLength: 100 },
      { key: 'escLastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Escalation contact last name', maxLength: 100 },
      { key: 'escDesignation', label: 'Designation', type: 'text', required: true, placeholder: 'e.g. Director, Senior Manager', maxLength: 100 },
      { key: 'escMobile', label: 'Mobile Number', type: 'tel', required: true, placeholder: '10-digit mobile', pattern: '^[6-9]\\d{9}$' },
      { key: 'escEmail', label: 'Email', type: 'email', required: true, placeholder: 'escalation@example.com' },
    ],
  },

  // ─── Section 7: KYC Documents (Mandatory for compliance) ─────────────────
  {
    id: 'kyc_documents',
    title: 'KYC Documents',
    icon: 'shield',
    description: 'Mandatory KYC documents required for compliance verification.',
    fields: [],
    documentFields: DOCUMENT_SECTION_KEYS['KYC Documents'],
  },

  // ─── Section 8: Authorized Signatory Details ─────────────────────────────
  {
    id: 'authorized_signatory',
    title: 'Authorized Signatory Details',
    icon: 'signature',
    description: 'Details and documents of the person authorized to sign on behalf of the company.',
    fields: [
      { key: 'authPersonName', label: 'Name of Authorized Person', type: 'text', required: true, placeholder: 'Full name of authorized signatory', maxLength: 200 },
    ],
    documentFields: DOCUMENT_SECTION_KEYS['Authorized Signatory'],
  },
];

// ─── Section completion helper ────────────────────────────────────────────────
export function getSectionCompletion(
  sectionId: string,
  formData: Record<string, string>,
  readonlyData: { firstName: string; lastName: string; email: string },
  docFieldsMap: Record<string, boolean>  // documentKey -> isUploaded
): { filled: number; total: number; percent: number; isComplete: boolean } {
  const section = B2B_FORM_SECTIONS.find(s => s.id === sectionId);
  if (!section) return { filled: 0, total: 0, percent: 0, isComplete: false };

  let total = 0;
  let filled = 0;

  for (const field of section.fields) {
    if (!field.required) continue;
    if (field.conditionalOn) {
      const controllingValue = formData[field.conditionalOn];
      if (field.conditionalValues?.length) {
        if (!field.conditionalValues.includes(controllingValue)) continue;
      } else if (field.conditionalValue !== undefined && controllingValue !== field.conditionalValue) {
        continue;
      }
    }
    total++;
    if (field.type === 'readonly') {
      const val = field.key === 'firstName' ? readonlyData.firstName : field.key === 'lastName' ? readonlyData.lastName : readonlyData.email;
      if (val?.trim()) filled++;
    } else {
      if (formData[field.key]?.trim()) filled++;
    }
  }

  for (const docField of section.documentFields ?? []) {
    if (!docField.required) continue;
    total++;
    if (docFieldsMap[docField.documentKey]) filled++;
  }

  const percent = total === 0 ? 100 : Math.round((filled / total) * 100);
  return { filled, total, percent, isComplete: filled === total };
}
