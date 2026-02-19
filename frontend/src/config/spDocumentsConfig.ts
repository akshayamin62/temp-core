// Hardcoded document structure for Service Provider documents
export interface SPDocumentField {
  documentKey: string;
  documentName: string;
  required: boolean;
  helpText?: string;
  order: number;
  hasSample?: boolean;
  sampleFileName?: string;
}

export const SP_DOCUMENTS_CONFIG: SPDocumentField[] = [
  {
    documentKey: 'authorised_signatory_pan',
    documentName: 'Authorised Signatory PAN Card',
    required: true,
    helpText: 'Upload PAN card of the authorised signatory',
    order: 1,
  },
  {
    documentKey: 'company_pan',
    documentName: 'Company PAN Card',
    required: true,
    helpText: 'Upload PAN card of the company',
    order: 2,
  },
  {
    documentKey: 'gst_registration_certificate',
    documentName: 'GST Registration Certificate',
    required: true,
    helpText: 'Upload GST registration certificate',
    order: 3,
  },
  {
    documentKey: 'certificate_of_incorporation',
    documentName: 'Certificate of Incorporation',
    required: true,
    helpText: 'Upload certificate of incorporation',
    order: 4,
  },
  {
    documentKey: 'shop_establishment_certificate',
    documentName: 'Shop and Establishment Certificate',
    required: true,
    helpText: 'Upload shop and establishment certificate',
    order: 5,
  },
  {
    documentKey: 'authorised_signatory_id_proof',
    documentName: 'Authorised Signatory ID Proof',
    required: true,
    helpText: 'Upload ID proof of the authorised signatory (Aadhar, Driving License, etc.)',
    order: 6,
  },
  {
    documentKey: 'authorised_signatory_photograph',
    documentName: 'Authorised Signatory Photograph',
    required: true,
    helpText: 'Upload a recent photograph of the authorised signatory',
    order: 7,
  },
  {
    documentKey: 'udyam_msme_certificate',
    documentName: 'UDYAM / MSME Certificate',
    required: false,
    helpText: 'Upload UDYAM or MSME certificate if applicable',
    order: 8,
  },
  {
    documentKey: 'recent_utility_bill',
    documentName: 'Recent Utility Bill',
    required: true,
    helpText: 'Upload a recent utility bill for address verification',
    order: 9,
  },
  {
    documentKey: 'declaration_authorized_person',
    documentName: 'Declaration of the Authorized Person',
    required: true,
    helpText: 'Download the sample, fill it, and upload the signed declaration',
    order: 10,
    hasSample: true,
    sampleFileName: 'Declaration_of_the_Authorized_Person.docx',
  },
  {
    documentKey: 'declaration_authorized_signatory',
    documentName: 'Declaration of Authorized Signatory',
    required: true,
    helpText: 'Download the sample, fill it, and upload the signed declaration',
    order: 11,
    hasSample: true,
    sampleFileName: 'Declaration_of_Authorized_Signatory.docx',
  },
];
