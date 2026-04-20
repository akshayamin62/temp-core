'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, onboardingAPI } from '@/lib/api';
import { User, USER_ROLE, OnboardingProfile, OnboardingDocument } from '@/types';
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

export default function AdvisorOnboardingPage() {
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADVISOR) {
        router.push('/');
        return;
      }
      if (response.data.data.advisor?.isVerified) {
        router.replace('/advisor/dashboard');
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
      const response = await onboardingAPI.viewDocument(profile._id, docType, 'Advisor');
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


  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
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
          <h2 className="text-lg font-bold text-gray-900 mb-2">Required Documents</h2>
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
                        <button
                          onClick={() => handleViewDocument(docType)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-blue-200 shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View
                        </button>
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

      </div>

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
