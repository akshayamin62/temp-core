'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { spDocumentAPI } from '@/lib/spDocumentAPI';
import { User, USER_ROLE, SPDocument, SPDocumentStatus, ServiceProviderProfile } from '@/types';
import { SP_DOCUMENTS_CONFIG, SPDocumentField } from '@/config/spDocumentsConfig';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

export default function ServiceProviderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [spProfile, setSpProfile] = useState<ServiceProviderProfile | null>(null);
  const [documents, setDocuments] = useState<SPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<SPDocument | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      
      if (userData.role !== USER_ROLE.SERVICE_PROVIDER) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);
      if (response.data.data.serviceProvider) {
        setSpProfile(response.data.data.serviceProvider);
      }
      fetchDocuments();
    } catch (error: any) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await spDocumentAPI.getMyDocuments();
      setDocuments(response.data.data.documents || []);
      if (response.data.data.serviceProvider) {
        setSpProfile(response.data.data.serviceProvider);
      }
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (field: SPDocumentField, file: File) => {
    setUploadingKey(field.documentKey);
    try {
      await spDocumentAPI.uploadDocument(
        field.documentKey,
        field.documentName,
        file
      );
      toast.success(`${field.documentName} uploaded successfully`);
      await fetchDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      await spDocumentAPI.uploadLogo(file);
      toast.success('Company logo uploaded successfully');
      await fetchProfile();
      await fetchDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleViewDocument = async (doc: SPDocument) => {
    try {
      const response = await spDocumentAPI.viewDocument(doc._id);
      const blob = new Blob([response.data], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      setViewBlobUrl(url);
      setViewingDoc(doc);
    } catch (error: any) {
      toast.error('Failed to view document');
    }
  };

  const closeViewer = () => {
    if (viewBlobUrl) {
      URL.revokeObjectURL(viewBlobUrl);
    }
    setViewBlobUrl(null);
    setViewingDoc(null);
  };

  const getDocumentForKey = (key: string): SPDocument | undefined => {
    return documents.find((doc) => doc.documentKey === key);
  };

  const getStatusBadge = (status: SPDocumentStatus) => {
    switch (status) {
      case SPDocumentStatus.APPROVED:
        return (
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case SPDocumentStatus.PENDING:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </span>
        );
      case SPDocumentStatus.REJECTED:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejected
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const fullName = getFullName(user);
  const initials = getInitials(user);
  const logoUrl = spProfile?.companyLogo ? `${BASE_URL}/${spProfile.companyLogo.replace(/^\//, '')}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Info Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
            {/* Logo Upload */}
            <div className="flex items-center space-x-3">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {uploadingLogo ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Company Logo'}
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG (max 10MB)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoField label="Full Name" value={fullName} />
            <InfoField label="Email" value={user.email} />
            <InfoField label="Mobile" value={spProfile?.mobileNumber || 'N/A'} />
            <InfoField label="Company Name" value={spProfile?.companyName || 'N/A'} />
            <InfoField label="Business Type" value={spProfile?.businessType || 'N/A'} />
            <InfoField label="Registration Number" value={spProfile?.registrationNumber || 'N/A'} />
            <InfoField label="GST Number" value={spProfile?.gstNumber || 'N/A'} />
            <InfoField label="Website" value={spProfile?.website || 'N/A'} />
            <InfoField label="Address" value={[spProfile?.address, spProfile?.city, spProfile?.state, spProfile?.country, spProfile?.pincode].filter(Boolean).join(', ') || 'N/A'} />
          </div>

          {spProfile?.servicesOffered && spProfile.servicesOffered.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Services Offered</label>
              <div className="flex flex-wrap gap-2">
                {spProfile.servicesOffered.map((service, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Required Documents</h2>
          <p className="text-sm text-gray-500 mb-6">
            Upload all required documents for verification. Documents will be reviewed by the admin.
          </p>

          <div className="space-y-4">
            {SP_DOCUMENTS_CONFIG.map((field) => {
              const doc = getDocumentForKey(field.documentKey);
              const isUploading = uploadingKey === field.documentKey;

              return (
                <div
                  key={field.documentKey}
                  className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 ${
                    doc
                      ? doc.status === SPDocumentStatus.APPROVED
                        ? 'border-green-300'
                        : doc.status === SPDocumentStatus.PENDING
                        ? 'border-yellow-300'
                        : 'border-red-300'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: doc icon + name + required + helptext */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium text-gray-900">{field.documentName}</h3>
                          {field.required && <span className="text-sm text-red-500 font-bold">*</span>}
                        </div>
                        {field.helpText && (
                          <p className="text-sm text-gray-500 mt-0.5">{field.helpText}</p>
                        )}
                        {doc?.rejectionMessage && (
                          <p className="text-sm text-red-600 mt-1">Reason: {doc.rejectionMessage}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: status + sample + view + upload */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc && (
                        <div className="flex-shrink-0">
                          {getStatusBadge(doc.status as SPDocumentStatus)}
                        </div>
                      )}
                      {field.hasSample && (
                        <a
                          href={`/samples/${field.sampleFileName}`}
                          download
                          className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-sm whitespace-nowrap"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Sample
                        </a>
                      )}
                      {doc && (
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-blue-200 shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View
                        </button>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[field.documentKey] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(field, file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[field.documentKey]?.click()}
                        disabled={isUploading}
                        className={`px-5 py-2.5 rounded-lg transition-all text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap ${
                          doc
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                        } disabled:opacity-50`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        {isUploading ? 'Uploading...' : doc ? 'Reupload' : 'Upload'}
                      </button>
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
                Total: <strong>{SP_DOCUMENTS_CONFIG.length}</strong>
              </span>
              <span className="text-green-600">
                Approved: <strong>{documents.filter(d => d.status === SPDocumentStatus.APPROVED).length}</strong>
              </span>
              <span className="text-yellow-600">
                Pending: <strong>{documents.filter(d => d.status === SPDocumentStatus.PENDING).length}</strong>
              </span>
              <span className="text-blue-600">
                Uploaded: <strong>{documents.length}</strong>
              </span>
              <span className="text-gray-400">
                Remaining: <strong>{SP_DOCUMENTS_CONFIG.length - documents.length}</strong>
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
              <h3 className="font-semibold text-gray-900">{viewingDoc.documentName}</h3>
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
              {viewingDoc.mimeType.startsWith('image/') ? (
                <img src={viewBlobUrl} alt={viewingDoc.documentName} className="max-w-full mx-auto" />
              ) : viewingDoc.mimeType === 'application/pdf' ? (
                <iframe src={viewBlobUrl} className="w-full h-[70vh]" title={viewingDoc.documentName} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">This file type cannot be previewed. Please download to view.</p>
                  <a href={viewBlobUrl} download={viewingDoc.fileName} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
