'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { spDocumentAPI } from '@/lib/spDocumentAPI';
import { User, USER_ROLE, SPDocument, SPDocumentStatus } from '@/types';
import { SP_DOCUMENTS_CONFIG } from '@/config/spDocumentsConfig';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

interface ServiceProviderDetail {
  _id: string;
  userId: string;
  email: string;
  mobileNumber?: string;
  companyName?: string;
  businessType?: string;
  registrationNumber?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  website?: string;
  companyLogo?: string;
  servicesOffered?: string[];
  createdAt: string;
}

export default function ServiceProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId as string;
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [serviceProvider, setServiceProvider] = useState<ServiceProviderDetail | null>(null);
  const [documents, setDocuments] = useState<SPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<SPDocument | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin privileges required.');
        router.push('/');
        return;
      }

      setCurrentUser(userData);
      await fetchServiceProviderDetail();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceProviderDetail = async () => {
    try {
      const response = await superAdminAPI.getServiceProviderDetail(providerId);
      const data = response.data.data;
      
      setUser(data.user);
      setServiceProvider(data.serviceProvider);
      
      // Fetch documents
      if (data.serviceProvider?._id) {
        fetchDocuments(data.serviceProvider._id);
      }
    } catch (error: any) {
      console.error('Error fetching service provider detail:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch service provider details');
      router.push('/super-admin/roles/service-provider');
    }
  };

  const fetchDocuments = async (spId: string) => {
    try {
      const response = await spDocumentAPI.getDocuments(spId);
      setDocuments(response.data.data.documents || []);
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleApproveDocument = async (docId: string) => {
    setActionLoading(docId);
    try {
      await spDocumentAPI.approveDocument(docId);
      toast.success('Document approved');
      if (serviceProvider?._id) {
        await fetchDocuments(serviceProvider._id);
      }
    } catch (error: any) {
      toast.error('Failed to approve document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDocument = async (docId: string) => {
    if (!rejectionMessage.trim()) {
      toast.error('Rejection message is required');
      return;
    }
    setActionLoading(docId);
    try {
      await spDocumentAPI.rejectDocument(docId, rejectionMessage);
      toast.success('Document rejected');
      setRejectingDocId(null);
      setRejectionMessage('');
      if (serviceProvider?._id) {
        await fetchDocuments(serviceProvider._id);
      }
    } catch (error: any) {
      toast.error('Failed to reject document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyUser = async () => {
    setVerifyLoading(true);
    try {
      await superAdminAPI.approveUser(providerId);
      toast.success('Service Provider verified successfully!');
      await fetchServiceProviderDetail();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify');
    } finally {
      setVerifyLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading || !currentUser || !user || !serviceProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const fullName = getFullName(user);
  const logoUrl = serviceProvider.companyLogo ? `${BASE_URL}/${serviceProvider.companyLogo.replace(/^\//, '')}` : null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/super-admin/roles/service-provider')}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Service Providers
              </button>
              <div className="flex items-center space-x-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" className="w-14 h-14 rounded-full object-cover border-2 border-blue-200" />
                ) : null}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
                  <p className="text-gray-600 mt-1">{serviceProvider.companyName || 'Service Provider Details'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.isVerified ? 'Verified' : 'Unverified'}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                user.isActive ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {!user.isVerified && (
                <button
                  onClick={handleVerifyUser}
                  disabled={verifyLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition-colors"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify User'}
                </button>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoField label="Full Name" value={fullName} />
              <InfoField label="Email" value={user.email} />
              <InfoField label="Mobile Number" value={serviceProvider.mobileNumber || 'N/A'} />
              <InfoField label="Account Created" value={new Date(user.createdAt || '').toLocaleDateString('en-GB')} />
              <InfoField label="Role" value="Service Provider" />
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoField label="Company Name" value={serviceProvider.companyName || 'N/A'} />
              <InfoField label="Business Type" value={serviceProvider.businessType || 'N/A'} />
              <InfoField label="Registration Number" value={serviceProvider.registrationNumber || 'N/A'} />
              <InfoField label="GST Number" value={serviceProvider.gstNumber || 'N/A'} />
              <InfoField label="Website" value={serviceProvider.website || 'N/A'} link={serviceProvider.website} />
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoField label="Address" value={serviceProvider.address || 'N/A'} fullWidth />
              <InfoField label="City" value={serviceProvider.city || 'N/A'} />
              <InfoField label="State" value={serviceProvider.state || 'N/A'} />
              <InfoField label="Country" value={serviceProvider.country || 'N/A'} />
              <InfoField label="Pincode" value={serviceProvider.pincode || 'N/A'} />
            </div>
          </div>

          {/* Services Offered */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Services Offered</h2>
            {serviceProvider.servicesOffered && serviceProvider.servicesOffered.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {serviceProvider.servicesOffered.map((service, index) => (
                  <span key={index} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {service}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No services listed</p>
            )}
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Documents</h2>
            <p className="text-sm text-gray-500 mb-6">Review and approve/reject uploaded documents.</p>

            {/* Document Stats */}
            <div className="flex items-center space-x-6 text-sm mb-6 pb-4 border-b border-gray-200">
              <span className="text-gray-600">Total Required: <strong>{SP_DOCUMENTS_CONFIG.length}</strong></span>
              <span className="text-green-600">Approved: <strong>{documents.filter(d => d.status === 'APPROVED').length}</strong></span>
              <span className="text-yellow-600">Pending: <strong>{documents.filter(d => d.status === 'PENDING').length}</strong></span>
              <span className="text-blue-600">Uploaded: <strong>{documents.length}</strong></span>
            </div>

            <div className="space-y-4">
              {SP_DOCUMENTS_CONFIG.map((field) => {
                const doc = getDocumentForKey(field.documentKey);

                return (
                  <div
                    key={field.documentKey}
                    className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 ${
                      doc
                        ? doc.status === 'APPROVED'
                          ? 'border-green-300'
                          : doc.status === 'PENDING'
                          ? 'border-yellow-300'
                          : 'border-red-300'
                        : 'border-gray-200'
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
                          {!doc && (
                            <p className="text-xs text-gray-400 mt-0.5">Not uploaded yet</p>
                          )}
                        </div>
                      </div>

                      {/* Right: status + view + approve/reject */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc && (
                          <div className="flex-shrink-0">
                            {getStatusBadge(doc.status)}
                          </div>
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
                        {doc && doc.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveDocument(doc._id)}
                              disabled={actionLoading === doc._id}
                              className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all font-semibold shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingDocId(doc._id);
                                setRejectionMessage('');
                              }}
                              disabled={actionLoading === doc._id}
                              className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all font-semibold shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rejection message input */}
                    {rejectingDocId === doc?._id && (
                      <div className="mt-3 flex items-end space-x-2">
                        <div className="flex-1">
                          <textarea
                            value={rejectionMessage}
                            onChange={(e) => setRejectionMessage(e.target.value)}
                            placeholder="Enter reason for rejection..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={2}
                          />
                        </div>
                        <button
                          onClick={() => handleRejectDocument(doc!._id)}
                          disabled={actionLoading === doc!._id}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => {
                            setRejectingDocId(null);
                            setRejectionMessage('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verify User Button (bottom) */}
          {!user.isVerified && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification</h2>
              <p className="text-gray-500 mb-4">
                After reviewing all documents & information, click below to verify this service provider.
              </p>
              <button
                onClick={handleVerifyUser}
                disabled={verifyLoading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-lg transition-colors"
              >
                {verifyLoading ? 'Verifying...' : 'Verify Service Provider'}
              </button>
            </div>
          )}
        </div>
      </SuperAdminLayout>

      {/* Document Viewer Modal */}
      {viewingDoc && viewBlobUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{viewingDoc.documentName}</h3>
                <p className="text-sm text-gray-500">{viewingDoc.fileName}</p>
              </div>
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
    </>
  );
}

// Helper component for displaying info fields
function InfoField({ label, value, link, fullWidth }: { label: string; value: string; link?: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="text-gray-900">{value}</p>
      )}
    </div>
  );
}
