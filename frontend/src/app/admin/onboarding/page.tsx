'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, onboardingAPI } from '@/lib/api';
import { b2bLeadDocumentAPI } from '@/lib/b2bLeadDocumentAPI';
import { User, USER_ROLE, OnboardingProfile, OnboardingDocument, B2BDocumentField, B2BLeadDocument, B2BDocumentStatus } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

const REQUIRED_DOCS = ['aadhar', 'pan'];
const ALL_DOC_TYPES = ['aadhar', 'pan', 'gst', 'company-registration', 'address-proof'];

const DOC_LABELS: Record<string, string> = {
  aadhar: 'Aadhar Card',
  pan: 'PAN Card',
  gst: 'GST Certificate',
  'company-registration': 'Company Registration',
  'address-proof': 'Address Proof',
};

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Company details form
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ companyName: '', address: '' });

  // Document viewing
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);
  const [viewMimeType, setViewMimeType] = useState<string>('');
  const [viewDocName, setViewDocName] = useState<string>('');

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // B2B Lead Documents
  const [b2bDocFields, setB2BDocFields] = useState<B2BDocumentField[]>([]);
  const [b2bDocuments, setB2BDocuments] = useState<B2BLeadDocument[]>([]);
  const [loadingB2BDocs, setLoadingB2BDocs] = useState(false);
  const [uploadingB2BDoc, setUploadingB2BDoc] = useState<string | null>(null);
  const b2bFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [viewingB2BDoc, setViewingB2BDoc] = useState<B2BLeadDocument | null>(null);
  const [viewB2BBlobUrl, setViewB2BBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchB2BDocuments();
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADMIN) {
        router.push('/');
        return;
      }
      if (response.data.data.admin?.isVerified) {
        router.replace('/admin/dashboard');
        return;
      }
      setUser(userData);
      fetchProfile();
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await onboardingAPI.getProfile();
      const p = response.data.data.profile;
      setProfile(p);
      setCompanyForm({ companyName: p.companyName || '', address: p.address || '' });
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const handleSaveCompanyDetails = async () => {
    if (!companyForm.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    try {
      setSaving(true);
      await onboardingAPI.updateProfile(companyForm);
      toast.success('Company details saved');
      setEditingCompany(false);
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (docType: string, file: File) => {
    try {
      setUploadingDoc(docType);
      await onboardingAPI.uploadDocument(docType, file);
      toast.success(`${DOC_LABELS[docType] || docType} uploaded successfully`);
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleViewDocument = async (docType: string) => {
    if (!profile) return;
    try {
      const response = await onboardingAPI.viewDocument(profile._id, docType, 'Admin');
      const mimeType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      if (viewBlobUrl) URL.revokeObjectURL(viewBlobUrl);
      setViewBlobUrl(url);
      setViewMimeType(mimeType);
      setViewDocName(DOC_LABELS[docType] || docType);
      setViewingDoc(docType);
    } catch {
      toast.error('Failed to view document');
    }
  };

  const closeViewer = () => {
    if (viewBlobUrl) URL.revokeObjectURL(viewBlobUrl);
    setViewBlobUrl(null);
    setViewingDoc(null);
  };

  const handleDownloadDocument = async (docType: string) => {
    if (!profile) return;
    try {
      const response = await onboardingAPI.viewDocument(profile._id, docType, 'Admin');
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', DOC_LABELS[docType] || docType);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download document'); }
  };

  const handleDownloadB2BDocument = async (doc: B2BLeadDocument) => {
    try {
      const response = await b2bLeadDocumentAPI.viewDocument(doc._id);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName || doc.documentName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download document'); }
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const fetchB2BDocuments = async () => {
    try {
      setLoadingB2BDocs(true);
      const [fieldsRes, docsRes] = await Promise.all([
        b2bLeadDocumentAPI.getMyFields(),
        b2bLeadDocumentAPI.getMyDocuments(),
      ]);
      setB2BDocFields(fieldsRes.data.data.fields || []);
      setB2BDocuments(docsRes.data.data.documents || []);
    } catch {
      // Silently ignore - user may not have a B2B lead
    } finally {
      setLoadingB2BDocs(false);
    }
  };

  const handleUploadB2BDocument = async (field: B2BDocumentField, file: File) => {
    try {
      setUploadingB2BDoc(field._id);
      await b2bLeadDocumentAPI.uploadDocument(null, field._id, field.documentKey, field.documentName, file);
      toast.success(`${field.documentName} uploaded`);
      await fetchB2BDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingB2BDoc(null);
    }
  };

  const handleViewB2BDocument = async (doc: B2BLeadDocument) => {
    try {
      const response = await b2bLeadDocumentAPI.viewDocument(doc._id);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      if (viewB2BBlobUrl) URL.revokeObjectURL(viewB2BBlobUrl);
      setViewB2BBlobUrl(blobUrl);
      setViewingB2BDoc({ ...doc, mimeType: response.headers['content-type'] || doc.mimeType });
    } catch {
      toast.error('Failed to load document');
    }
  };

  const closeB2BViewer = () => {
    if (viewB2BBlobUrl) URL.revokeObjectURL(viewB2BBlobUrl);
    setViewingB2BDoc(null);
    setViewB2BBlobUrl(null);
  };

  const getDocForField = (fieldId: string): B2BLeadDocument | undefined =>
    b2bDocuments.find(d => (typeof d.documentFieldId === 'string' ? d.documentFieldId : (d.documentFieldId as B2BDocumentField)._id) === fieldId);

  const getB2BStatusBadge = (status: B2BDocumentStatus) => {
    if (status === B2BDocumentStatus.APPROVED)
      return <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>;
    if (status === B2BDocumentStatus.PENDING)
      return <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300"><svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Pending</span>;
    return <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300"><svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Rejected</span>;
  };

  const getDocByType = (type: string): OnboardingDocument | undefined =>
    profile?.documents.find(d => d.type === type);

  const hasRejectedDocs = profile?.documents.some(d => d.status === 'REJECTED') ?? false;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Onboarding</h1>
            <p className="text-gray-500 mt-1">Fill in your company details and upload required documents</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Status Banners */}
        {hasRejectedDocs && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-medium text-red-800">Some documents were rejected</p>
              <p className="text-sm text-red-600">Please re-upload the rejected documents and submit again.</p>
            </div>
          </div>
        )}

        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoField label="Full Name" value={`${user.firstName} ${user.lastName}`} />
            <InfoField label="Email" value={user.email} />
            <InfoField label="Mobile" value={profile?.mobileNumber || 'N/A'} />
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Company Information</h2>
            {!editingCompany ? (
              <button
                onClick={() => { setEditingCompany(true); setCompanyForm({ companyName: profile?.companyName || '', address: profile?.address || '' }); }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {profile?.companyName ? 'Edit' : 'Add Details'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingCompany(false); setCompanyForm({ companyName: profile?.companyName || '', address: profile?.address || '' }); }}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCompanyDetails}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          {editingCompany ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Enter your company name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Enter your business address"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoField label="Company Name" value={profile?.companyName || 'N/A'} />
              <InfoField label="Address" value={profile?.address || 'N/A'} />
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Documents</h2>
          <p className="text-sm text-gray-500 mb-6">
            Upload all required documents for verification. Documents will be reviewed by the operations team.
          </p>

          <div className="space-y-4">
            {ALL_DOC_TYPES.map((docType) => {
              const doc = getDocByType(docType);
              const isRequired = REQUIRED_DOCS.includes(docType);
              const isUploading = uploadingDoc === docType;
              const canUpload = !doc || doc.status !== 'APPROVED';

              return (
                <div
                  key={docType}
                  className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 ${
                    doc
                      ? doc.status === 'APPROVED'
                        ? 'border-green-300'
                        : doc.status === 'PENDING'
                        ? 'border-yellow-300'
                        : 'border-red-300'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium text-gray-900">{DOC_LABELS[docType] || docType}</h3>
                          {isRequired && <span className="text-sm text-red-500 font-bold">*</span>}
                        </div>
                        {doc?.rejectReason && (
                          <p className="text-sm text-red-600 mt-0.5">Reason: {doc.rejectReason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc && (
                        <div className="flex-shrink-0">
                          {getStatusBadge(doc.status)}
                        </div>
                      )}
                      {doc?.url && (
                        <>
                          <button onClick={() => handleViewDocument(docType)} className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-blue-200 shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View
                          </button>
                          <button onClick={() => handleDownloadDocument(docType)} className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download
                          </button>
                        </>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[docType] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadDocument(docType, file);
                          e.target.value = '';
                        }}
                      />
                      {canUpload && (
                        <button
                          onClick={() => fileInputRefs.current[docType]?.click()}
                          disabled={isUploading}
                          className="px-5 py-2.5 rounded-lg transition-all text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                          </svg>
                          {isUploading ? 'Uploading...' : doc ? 'Reupload' : 'Upload'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-6 text-sm">
              <span className="text-gray-600">
                Total: <strong>{ALL_DOC_TYPES.length}</strong>
              </span>
              <span className="text-green-600">
                Approved: <strong>{profile?.documents.filter(d => d.status === 'APPROVED').length || 0}</strong>
              </span>
              <span className="text-yellow-600">
                Pending: <strong>{profile?.documents.filter(d => d.status === 'PENDING').length || 0}</strong>
              </span>
              <span className="text-blue-600">
                Uploaded: <strong>{profile?.documents.length || 0}</strong>
              </span>
              <span className="text-gray-400">
                Remaining: <strong>{ALL_DOC_TYPES.length - (profile?.documents.length || 0)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* B2B Lead Documents */}
        {b2bDocFields.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">B2B Lead Documents</h2>
              <p className="text-gray-500 text-sm mt-1">Documents required by your B2B manager</p>
            </div>
            {loadingB2BDocs && <div className="animate-spin h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent" />}
          </div>

          <div className="space-y-4">
            {b2bDocFields.map(field => {
              const doc = getDocForField(field._id);
              const borderColor = !doc ? 'border-gray-200' : doc.status === B2BDocumentStatus.APPROVED ? 'border-green-400' : doc.status === B2BDocumentStatus.REJECTED ? 'border-red-400' : 'border-yellow-400';
              return (
                <div key={field._id} className={`border-2 ${borderColor} rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mt-0.5">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                            {field.documentName}
                            {field.required && <span className="text-red-500 font-bold">*</span>}
                          </h3>
                          {field.helpText && <p className="text-sm text-gray-500 mt-0.5">{field.helpText}</p>}
                          {doc?.status === B2BDocumentStatus.REJECTED && doc.rejectionMessage && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <span><strong>Rejection reason:</strong> {doc.rejectionMessage}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {doc && getB2BStatusBadge(doc.status)}
                          {doc && (
                            <>
                              <button
                                onClick={() => handleViewB2BDocument(doc)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 hover:from-blue-100 hover:to-blue-200 transition-all duration-200"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadB2BDocument(doc)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-300 hover:from-gray-100 hover:to-gray-200 transition-all duration-200"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => b2bFileInputRefs.current[field._id]?.click()}
                            disabled={uploadingB2BDoc === field._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingB2BDoc === field._id ? (
                              <><div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent" />Uploading...</>
                            ) : (
                              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>{doc ? 'Re-upload' : 'Upload'}</>
                            )}
                          </button>
                          <input
                            type="file"
                            className="hidden"
                            ref={el => { b2bFileInputRefs.current[field._id] = el; }}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadB2BDocument(field, file);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
            <span className="text-gray-500">Total: <strong className="text-gray-900">{b2bDocFields.length}</strong></span>
            <span className="text-green-600">Approved: <strong>{b2bDocuments.filter(d => d.status === B2BDocumentStatus.APPROVED).length}</strong></span>
            <span className="text-yellow-600">Pending: <strong>{b2bDocuments.filter(d => d.status === B2BDocumentStatus.PENDING).length}</strong></span>
            <span className="text-red-600">Rejected: <strong>{b2bDocuments.filter(d => d.status === B2BDocumentStatus.REJECTED).length}</strong></span>
            <span className="text-blue-600">Uploaded: <strong>{b2bDocuments.length}</strong></span>
            <span className="text-gray-400">Remaining: <strong>{b2bDocFields.filter(f => !getDocForField(f._id)).length}</strong></span>
          </div>
        </div>
      )}

      </div>

      {/* B2B Document Viewer Modal */}
      {viewingB2BDoc && viewB2BBlobUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{viewingB2BDoc.documentName}</h3>
              <button onClick={closeB2BViewer} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingB2BDoc.mimeType?.startsWith('image/') ? (
                <img src={viewB2BBlobUrl} alt={viewingB2BDoc.documentName} className="max-w-full mx-auto" />
              ) : (
                <iframe src={viewB2BBlobUrl} className="w-full h-full min-h-[60vh]" title={viewingB2BDoc.documentName} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && viewBlobUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{viewDocName}</h3>
              <button
                onClick={closeViewer}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewMimeType.startsWith('image/') ? (
                <img src={viewBlobUrl} alt={viewDocName} className="max-w-full mx-auto" />
              ) : viewMimeType === 'application/pdf' ? (
                <iframe src={viewBlobUrl} className="w-full h-[70vh]" title={viewDocName} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">This file type cannot be previewed. Please download to view.</p>
                  <a href={viewBlobUrl} download className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <p className="text-gray-900">{value}</p>
    </div>
  );
}
