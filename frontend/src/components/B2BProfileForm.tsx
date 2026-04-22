'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import { b2bLeadDocumentAPI } from '@/lib/b2bLeadDocumentAPI';
import { B2BDocumentField, B2BLeadDocument, B2BDocumentStatus } from '@/types';
import { B2B_FORM_SECTIONS, DOCUMENT_SECTION_KEYS } from '@/config/b2bOnboardingConfig';

export interface B2BProfileFormProps {
  profileData: Record<string, string>;
  readonlyData: { firstName: string; lastName: string; email: string };
  b2bDocFields: B2BDocumentField[];
  b2bDocuments: B2BLeadDocument[];
  loadingDocs?: boolean;
  /** true = view-only; default false */
  readOnly?: boolean;
  /** which sectionId is currently being saved */
  savingSection?: string | null;
  onFieldChange?: (key: string, value: string) => void;
  onSaveSection?: (sectionId: string) => void;
  uploadingDocId?: string | null;
  onUploadDoc?: (field: B2BDocumentField, file: File) => void;
  /** allow approve / reject buttons (super-admin / b2b-ops) */
  canReviewDocs?: boolean;
  reviewingDocId?: string | null;
  onApproveDoc?: (docId: string) => void;
  onRejectDoc?: (docId: string, message: string) => void;
}

// ─── Tab definitions ─────────────────────────────────────────────────────────
const FORM_TABS = [
  { id: 'basic_identity', title: 'Basic Identity' },
  { id: 'business_registration', title: 'Business Registration' },
  { id: 'tax_financial', title: 'Tax & Financial' },
  { id: 'company_details', title: 'Company Details' },
  { id: 'poc_details', title: 'POC Details' },
  { id: 'escalation_matrix', title: 'Escalation Matrix' },
  { id: '__documents__', title: 'Documents' },
];

const DOC_SECTION_ORDER = [
  'Business Registration',
  'Tax & Financial',
  'KYC Documents',
  'Authorized Signatory',
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function B2BProfileForm({
  profileData,
  readonlyData,
  b2bDocFields,
  b2bDocuments,
  loadingDocs = false,
  readOnly = false,
  savingSection = null,
  onFieldChange,
  onSaveSection,
  uploadingDocId = null,
  onUploadDoc,
  canReviewDocs = false,
  reviewingDocId = null,
  onApproveDoc,
  onRejectDoc,
}: B2BProfileFormProps) {
  const [activeTab, setActiveTab] = useState<string>('basic_identity');

  // Location dropdown option lists
  const [countries] = useState(() => Country.getAllCountries());
  const [states1, setStates1] = useState<any[]>([]);
  const [cities1, setCities1] = useState<any[]>([]);
  const [states4, setStates4] = useState<any[]>([]);
  const [cities4, setCities4] = useState<any[]>([]);

  // Internal document viewer
  const [viewingDoc, setViewingDoc] = useState<B2BLeadDocument | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);

  // Reject modal
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectMsg, setRejectMsg] = useState('');

  // File input refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Location cascade effects ──────────────────────────────────────────────
  useEffect(() => {
    setStates1(profileData.country ? State.getStatesOfCountry(profileData.country) : []);
  }, [profileData.country]);

  useEffect(() => {
    setCities1(
      profileData.country && profileData.state
        ? City.getCitiesOfState(profileData.country, profileData.state)
        : []
    );
  }, [profileData.country, profileData.state]);

  useEffect(() => {
    setStates4(profileData.companyCountry ? State.getStatesOfCountry(profileData.companyCountry) : []);
  }, [profileData.companyCountry]);

  useEffect(() => {
    setCities4(
      profileData.companyCountry && profileData.companyState
        ? City.getCitiesOfState(profileData.companyCountry, profileData.companyState)
        : []
    );
  }, [profileData.companyCountry, profileData.companyState]);

  const getFieldValue = (key: string): string => {
    if (key === 'firstName') return readonlyData.firstName;
    if (key === 'lastName') return readonlyData.lastName;
    if (key === 'email') return readonlyData.email;
    return profileData[key] || '';
  };

  // ── Document viewer ───────────────────────────────────────────────────────
  const handleViewDoc = async (doc: B2BLeadDocument) => {
    try {
      const res = await b2bLeadDocumentAPI.viewDocument(doc._id);
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      if (viewBlobUrl) URL.revokeObjectURL(viewBlobUrl);
      const url = URL.createObjectURL(blob);
      setViewBlobUrl(url);
      setViewingDoc({ ...doc, mimeType: res.headers['content-type'] || doc.mimeType });
    } catch {
      // parent toasts errors
    }
  };

  const handleDownloadDoc = async (doc: B2BLeadDocument) => {
    try {
      const res = await b2bLeadDocumentAPI.viewDocument(doc._id);
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || doc.documentName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  const closeViewer = () => {
    if (viewBlobUrl) URL.revokeObjectURL(viewBlobUrl);
    setViewingDoc(null);
    setViewBlobUrl(null);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDocForField = useCallback(
    (fieldId: string) =>
      b2bDocuments.find(d => {
        const id =
          typeof d.documentFieldId === 'string'
            ? d.documentFieldId
            : (d.documentFieldId as any)?._id;
        return id === fieldId;
      }),
    [b2bDocuments]
  );

  const getStatusBadge = (status: B2BDocumentStatus) => {
    if (status === B2BDocumentStatus.APPROVED)
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          Approved
        </span>
      );
    if (status === B2BDocumentStatus.PENDING)
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
          Pending
        </span>
      );
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        Rejected
      </span>
    );
  };

  // ── Field renderer ────────────────────────────────────────────────────────
  const renderField = (field: any): React.ReactNode => {
    if (field.conditionalOn && profileData[field.conditionalOn] !== field.conditionalValue)
      return null;

    const val = getFieldValue(field.key);
    const isRequired = !!field.required;
    const labelEl = (
      <label className="text-sm font-medium text-gray-700">
        {field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
    const colSpan = field.type === 'textarea' ? 'md:col-span-2' : '';

    // ── Display-only ──
    if (readOnly || field.type === 'readonly') {
      let displayVal = val;
      if (field.key === 'country' || field.key === 'companyCountry') {
        displayVal = countries.find(c => c.isoCode === val)?.name || val;
      } else if (field.key === 'state') {
        displayVal = states1.find((s: any) => s.isoCode === val)?.name || val;
      } else if (field.key === 'companyState') {
        displayVal = states4.find((s: any) => s.isoCode === val)?.name || val;
      }
      return (
        <div key={field.key} className={`flex flex-col gap-1 ${colSpan}`}>
          {labelEl}
          <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-800 min-h-9.5 break-words">
            {displayVal || <span className="text-gray-400 italic">Not filled</span>}
          </div>
        </div>
      );
    }

    // ── Select ──
    if (field.type === 'select') {
      let options: { value: string; label: string }[] = [];
      let disabled = false;

      if (field.key === 'country' || field.key === 'companyCountry') {
        options = countries.map(c => ({ value: c.isoCode, label: c.name }));
      } else if (field.key === 'state' || field.key === 'companyState') {
        const list = field.key === 'state' ? states1 : states4;
        options = list.map((s: any) => ({ value: s.isoCode, label: s.name }));
        disabled = options.length === 0;
      } else if (field.key === 'city' || field.key === 'companyCity') {
        const list = field.key === 'city' ? cities1 : cities4;
        options = list.map((c: any) => ({ value: c.name, label: c.name }));
        disabled = options.length === 0;
      } else {
        options = (field.options || []).map((o: string) => ({ value: o, label: o }));
      }

      return (
        <div key={field.key} className="flex flex-col gap-1">
          {labelEl}
          <select
            value={val}
            onChange={e => onFieldChange?.(field.key, e.target.value)}
            disabled={disabled}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.hint && <p className="text-xs text-gray-500">{field.hint}</p>}
        </div>
      );
    }

    // ── Textarea ──
    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="flex flex-col gap-1 md:col-span-2">
          {labelEl}
          <textarea
            rows={3}
            value={val}
            onChange={e => onFieldChange?.(field.key, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          {field.hint && <p className="text-xs text-gray-500">{field.hint}</p>}
        </div>
      );
    }

    // ── Text / tel / email ──
    return (
      <div key={field.key} className="flex flex-col gap-1">
        {labelEl}
        <input
          type={field.type || 'text'}
          value={val}
          onChange={e => onFieldChange?.(field.key, e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {field.hint && <p className="text-xs text-gray-500">{field.hint}</p>}
      </div>
    );
  };

  // ── Single doc card ───────────────────────────────────────────────────────
  const renderDocCard = (field: B2BDocumentField) => {
    const doc = getDocForField(field._id);
    const isUploading = uploadingDocId === field._id;
    const isReviewing = reviewingDocId === doc?._id;
    const borderColor = !doc
      ? 'border-gray-200'
      : doc.status === B2BDocumentStatus.APPROVED
      ? 'border-green-400'
      : doc.status === B2BDocumentStatus.REJECTED
      ? 'border-red-400'
      : 'border-yellow-400';

    return (
      <div key={field._id}>
        <div className={`border-2 ${borderColor} rounded-xl p-4 bg-white`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900">{field.documentName}</span>
                {field.required && <span className="text-red-500 text-sm font-bold">*</span>}
              </div>
              {field.helpText && <p className="text-xs text-gray-500 mt-0.5">{field.helpText}</p>}
              {doc?.status === B2BDocumentStatus.REJECTED && doc.rejectionMessage && (
                <p className="text-xs text-red-600 mt-1">Rejected: {doc.rejectionMessage}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {doc && getStatusBadge(doc.status)}

              {doc && (
                <>
                  <button
                    onClick={() => handleViewDoc(doc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadDoc(doc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </>
              )}

              {!readOnly && onUploadDoc && (
                <>
                  <input
                    type="file"
                    className="hidden"
                    ref={el => { fileInputRefs.current[field._id] = el; }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) onUploadDoc(field, f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[field._id]?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent" />
                        Uploading.
                      </>
                    ) : (
                      <>{doc ? 'Re-upload' : 'Upload'}</>
                    )}
                  </button>
                </>
              )}

              {canReviewDocs && doc && doc.status === B2BDocumentStatus.PENDING && (
                <>
                  <button
                    onClick={() => onApproveDoc?.(doc._id)}
                    disabled={isReviewing}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isReviewing ? '.' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setRejectDocId(doc._id); setRejectMsg(''); }}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {rejectDocId === doc?._id && (
          <div className="mt-2 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <input
              type="text"
              value={rejectMsg}
              onChange={e => setRejectMsg(e.target.value)}
              placeholder="Reason for rejection"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => {
                if (doc) { onRejectDoc?.(doc._id, rejectMsg.trim()); setRejectDocId(null); setRejectMsg(''); }
              }}
              disabled={!rejectMsg.trim()}
              className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              Confirm
            </button>
            <button
              onClick={() => { setRejectDocId(null); setRejectMsg(''); }}
              className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Group doc fields by section ───────────────────────────────────────────
  const docsBySection: Record<string, B2BDocumentField[]> = {};
  const docSectionByKey: Record<string, string> = {};
  Object.entries(DOCUMENT_SECTION_KEYS).forEach(([sectionName, fields]) => {
    fields.forEach(f => { docSectionByKey[f.documentKey] = sectionName; });
  });
  b2bDocFields.forEach(f => {
    const sec = docSectionByKey[f.documentKey] || 'Other';
    if (!docsBySection[sec]) docsBySection[sec] = [];
    docsBySection[sec].push(f);
  });

  // authPersonName field from authorized_signatory section
  const authPersonNameField = B2B_FORM_SECTIONS.find(s => s.id === 'authorized_signatory')?.fields.find(f => f.key === 'authPersonName');

  // ── Tab: info section ─────────────────────────────────────────────────────
  const renderInfoTab = (sectionId: string) => {
    const section = B2B_FORM_SECTIONS.find(s => s.id === sectionId);
    if (!section) return null;
    const isSaving = savingSection === sectionId;
    const hasEditableFields = section.fields.some((f: any) => f.type !== 'readonly');

    return (
      <div>
        {/* Copy shortcuts */}
        {!readOnly && sectionId === 'company_details' && (
          <div className="mb-4">
            <button
              onClick={() => {
                const map: Record<string, string> = {
                  companyOfficialName: 'companyName',
                  companyMobile: 'primaryMobile',
                  companyOfficeAddress: 'officeAddress',
                  companyCountry: 'country',
                  companyState: 'state',
                  companyCity: 'city',
                  companyPinCode: 'pinCode',
                };
                Object.entries(map).forEach(([dst, src]) => onFieldChange?.(dst, profileData[src] || ''));
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy from Basic Identity
            </button>
          </div>
        )}
        {!readOnly && sectionId === 'escalation_matrix' && (
          <div className="mb-4">
            <button
              onClick={() => {
                const keys = ['escFirstName', 'escMiddleName', 'escLastName', 'escDesignation', 'escMobile', 'escEmail'];
                const src = ['pocFirstName', 'pocMiddleName', 'pocLastName', 'pocDesignation', 'pocMobile', 'pocEmail'];
                keys.forEach((k, i) => onFieldChange?.(k, profileData[src[i]] || ''));
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy from POC Details
            </button>
          </div>
        )}

        {/* Fields grid */}
        {section.fields.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((f: any) => renderField(f))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic text-center py-8">No form fields in this section.</p>
        )}

        {/* Save button */}
        {!readOnly && onSaveSection && hasEditableFields && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => onSaveSection(sectionId)}
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                  Saving.
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Section
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Tab: documents ────────────────────────────────────────────────────────
  const renderDocumentsTab = () => {
    if (loadingDocs) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {DOC_SECTION_ORDER.map(secName => {
          const fields = docsBySection[secName] || [];
          const isAuthSignatory = secName === 'Authorized Signatory';

          return (
            <div key={secName} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <h3 className="text-sm font-semibold text-gray-800">{secName}</h3>
              </div>
              <div className="p-5 space-y-3">
                {/* Name of Authorized Person field at top of Authorized Signatory section */}
                {isAuthSignatory && authPersonNameField && (
                  <div className="pb-4 mb-1 border-b border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {renderField(authPersonNameField)}
                    </div>
                  </div>
                )}

                {fields.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    No documents configured for this section.
                  </p>
                ) : (
                  fields.map(field => renderDocCard(field))
                )}
              </div>

              {/* Save button for Authorized Signatory (for authPersonName) */}
              {isAuthSignatory && !readOnly && onSaveSection && authPersonNameField && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => onSaveSection('authorized_signatory')}
                    disabled={savingSection === 'authorized_signatory'}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection === 'authorized_signatory' ? (
                      <>
                        <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent" />
                        Saving.
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Authorized Signatory
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Horizontal tab bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 overflow-x-auto gap-0.5">
          {FORM_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap text-sm flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === '__documents__' ? renderDocumentsTab() : renderInfoTab(activeTab)}
      </div>

      {/* Document viewer modal */}
      {viewingDoc && viewBlobUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{viewingDoc.documentName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDoc(viewingDoc)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button onClick={closeViewer} className="p-2 hover:bg-gray-100 rounded-full">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingDoc.mimeType?.startsWith('image/') ? (
                <img src={viewBlobUrl} alt={viewingDoc.documentName} className="max-w-full mx-auto" />
              ) : (
                <iframe
                  src={viewBlobUrl}
                  className="w-full h-full min-h-[60vh]"
                  title={viewingDoc.documentName}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}