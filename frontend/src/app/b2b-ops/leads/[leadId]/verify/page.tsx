'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, b2bAPI, onboardingAPI } from '@/lib/api';
import { b2bLeadDocumentAPI } from '@/lib/b2bLeadDocumentAPI';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2B_LEAD_TYPE, OnboardingProfile, OnboardingDocument, B2BDocumentField, B2BLeadDocument, B2BDocumentStatus } from '@/types';
import B2BOpsLayout from '@/components/B2BOpsLayout';
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

export default function B2BOpsVerifyPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any | null>(null);

  // Onboarding review
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingDocType, setRejectingDocType] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  // Document viewing
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [viewBlobUrl, setViewBlobUrl] = useState<string | null>(null);
  const [viewMimeType, setViewMimeType] = useState('');
  const [viewDocName, setViewDocName] = useState('');

  // Document uploading by OPS
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Company details editing
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ companyName: '', address: '' });
  const [savingCompany, setSavingCompany] = useState(false);

  // B2B Lead Documents
  const [b2bDocFields, setB2BDocFields] = useState<B2BDocumentField[]>([]);
  const [b2bDocuments, setB2BDocuments] = useState<B2BLeadDocument[]>([]);
  const [loadingB2BDocs, setLoadingB2BDocs] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldHelpText, setNewFieldHelpText] = useState('');
  const [showAddField, setShowAddField] = useState(false);
  const [uploadingB2BDoc, setUploadingB2BDoc] = useState<string | null>(null);
  const b2bFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [viewingB2BDoc, setViewingB2BDoc] = useState<B2BLeadDocument | null>(null);
  const [viewB2BBlobUrl, setViewB2BBlobUrl] = useState<string | null>(null);
  const [rejectingB2BDocId, setRejectingB2BDocId] = useState<string | null>(null);
  const [b2bRejectMessage, setB2BRejectMessage] = useState('');
  const [reviewingB2BDoc, setReviewingB2BDoc] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (user) fetchLead(); }, [user, leadId]);
  useEffect(() => {
    if (lead && (lead.createdAdminId || lead.createdAdvisorId)) {
      fetchOnboardingProfile();
    }
  }, [lead?.createdAdminId, lead?.createdAdvisorId]);
  useEffect(() => {
    if (lead?._id) fetchB2BDocuments();
  }, [lead?._id]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.B2B_OPS) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
    } catch {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await b2bAPI.getLeadDetail(leadId);
      setLead(response.data.data.lead);
    } catch {
      toast.error('Failed to fetch lead details');
      router.push('/b2b-ops/leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnboardingProfile = async () => {
    if (!lead?.createdAdminId && !lead?.createdAdvisorId) return;
    const raw = lead.createdAdminId || lead.createdAdvisorId;
    const profileId = typeof raw === 'object' && raw !== null ? raw._id : raw;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      setLoadingOnboarding(true);
      const response = await onboardingAPI.getReview(profileId, role);
      setOnboardingProfile(response.data.data.profile);
    } catch {
      toast.error('Failed to load onboarding profile');
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const handleReviewDocument = async (docType: string, action: 'approve' | 'reject') => {
    if (!onboardingProfile) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setReviewingDoc(docType);
      await onboardingAPI.reviewDocument(onboardingProfile._id, {
        documentType: docType, action,
        rejectReason: action === 'reject' ? rejectReason : undefined,
        role,
      });
      toast.success(`Document ${action === 'approve' ? 'approved' : 'rejected'}`);
      setRejectingDocType(null);
      setRejectReason('');
      await fetchOnboardingProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} document`);
    } finally {
      setReviewingDoc(null);
    }
  };

  const handleViewDocument = async (docType: string) => {
    if (!onboardingProfile) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      const response = await onboardingAPI.viewDocument(onboardingProfile._id, docType, role);
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      setViewBlobUrl(blobUrl);
      setViewMimeType(response.headers['content-type'] || 'application/octet-stream');
      setViewDocName(DOC_LABELS[docType] || docType);
      setViewingDoc(docType);
    } catch {
      toast.error('Failed to load document');
    }
  };

  const closeViewer = () => {
    if (viewBlobUrl) URL.revokeObjectURL(viewBlobUrl);
    setViewingDoc(null);
    setViewBlobUrl(null);
    setViewMimeType('');
    setViewDocName('');
  };

  const handleUploadDocument = async (docType: string, file: File) => {
    if (!onboardingProfile) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      setUploadingDoc(docType);
      await onboardingAPI.uploadDocumentForProfile(onboardingProfile._id, docType, file, role);
      toast.success(`${DOC_LABELS[docType] || docType} uploaded and auto-approved`);
      await fetchOnboardingProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRequestApproval = async () => {
    if (!lead) return;
    try {
      setConverting(true);
      await b2bAPI.requestAdminAdvisorConversion(leadId);
      toast.success('Approval request sent to Super Admin successfully!');
      fetchLead();
      fetchOnboardingProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request approval');
    } finally {
      setConverting(false);
    }
  };

  const handleSaveCompanyDetails = async () => {
    if (!onboardingProfile) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      setSavingCompany(true);
      await onboardingAPI.updateCompanyDetails(onboardingProfile._id, {
        companyName: companyForm.companyName,
        address: companyForm.address,
        role,
      });
      toast.success('Company details updated');
      setEditingCompany(false);
      await fetchOnboardingProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update company details');
    } finally {
      setSavingCompany(false);
    }
  };

  const fetchB2BDocuments = async () => {
    try {
      setLoadingB2BDocs(true);
      const [fieldsRes, docsRes] = await Promise.all([
        b2bLeadDocumentAPI.getFields(leadId),
        b2bLeadDocumentAPI.getDocuments(leadId),
      ]);
      setB2BDocFields(fieldsRes.data.data.fields || []);
      setB2BDocuments(docsRes.data.data.documents || []);
    } catch {
      // silently fail
    } finally {
      setLoadingB2BDocs(false);
    }
  };

  const handleAddB2BDocField = async () => {
    if (!newFieldName.trim()) { toast.error('Document name is required'); return; }
    try {
      setAddingField(true);
      await b2bLeadDocumentAPI.addField({ leadId, documentName: newFieldName.trim(), required: true, helpText: newFieldHelpText.trim() || undefined });
      toast.success('Document field added');
      setNewFieldName('');
      setNewFieldRequired(false);
      setNewFieldHelpText('');
      setShowAddField(false);
      await fetchB2BDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add field');
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteB2BDocField = async (fieldId: string) => {
    try {
      await b2bLeadDocumentAPI.deleteField(fieldId);
      toast.success('Document field removed');
      await fetchB2BDocuments();
    } catch {
      toast.error('Failed to remove field');
    }
  };

  const handleUploadB2BDocument = async (field: B2BDocumentField, file: File) => {
    try {
      setUploadingB2BDoc(field._id);
      await b2bLeadDocumentAPI.uploadDocument(leadId, field._id, field.documentKey, field.documentName, file);
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
      const blob = new Blob([response.data], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      setViewB2BBlobUrl(url);
      setViewingB2BDoc(doc);
    } catch {
      toast.error('Failed to load document');
    }
  };

  const closeB2BViewer = () => {
    if (viewB2BBlobUrl) URL.revokeObjectURL(viewB2BBlobUrl);
    setViewingB2BDoc(null);
    setViewB2BBlobUrl(null);
  };

  const handleApproveB2BDocument = async (docId: string) => {
    try {
      setReviewingB2BDoc(docId);
      await b2bLeadDocumentAPI.approveDocument(docId);
      toast.success('Document approved');
      await fetchB2BDocuments();
    } catch { toast.error('Failed to approve document'); }
    finally { setReviewingB2BDoc(null); }
  };

  const handleRejectB2BDocument = async (docId: string) => {
    if (!b2bRejectMessage.trim()) { toast.error('Rejection message required'); return; }
    try {
      setReviewingB2BDoc(docId);
      await b2bLeadDocumentAPI.rejectDocument(docId, b2bRejectMessage.trim());
      toast.success('Document rejected');
      setRejectingB2BDocId(null);
      setB2BRejectMessage('');
      await fetchB2BDocuments();
    } catch { toast.error('Failed to reject document'); }
    finally { setReviewingB2BDoc(null); }
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

  const handleDownloadOnboardingDoc = async (docType: string) => {
    if (!onboardingProfile) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      const response = await onboardingAPI.viewDocument(onboardingProfile._id, docType, role);
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

  const getDocForField = (fieldId: string): B2BLeadDocument | undefined =>
    b2bDocuments.find(d => (typeof d.documentFieldId === 'object' ? d.documentFieldId._id : d.documentFieldId) === fieldId);

  const getB2BStatusBadge = (status: B2BDocumentStatus) => {
    switch (status) {
      case B2BDocumentStatus.APPROVED: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>;
      case B2BDocumentStatus.PENDING: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Review</span>;
      case B2BDocumentStatus.REJECTED: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>;
      default: return null;
    }
  };

  // B2B docs readiness: all fields must have an uploaded+approved doc
  const allB2BDocsReady = b2bDocFields.length === 0 || b2bDocFields.every(f => {
    const doc = getDocForField(f._id);
    return doc && doc.status === B2BDocumentStatus.APPROVED;
  });

  const getFullName = (u: any) => [u?.firstName, u?.middleName, u?.lastName].filter(Boolean).join(' ');
  const getStageColor = (stage: string) => {
    switch (stage) {
      case B2B_LEAD_STAGE.IN_PROCESS: return 'bg-purple-100 text-purple-800';
      case B2B_LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case B2B_LEAD_TYPE.FRANCHISE: return 'bg-indigo-100 text-indigo-800';
      case B2B_LEAD_TYPE.INSTITUTION: return 'bg-amber-100 text-amber-800';
      case B2B_LEAD_TYPE.ADVISOR: return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocByType = (type: string): OnboardingDocument | undefined => onboardingProfile?.documents.find(d => d.type === type);

  // Check: all REQUIRED docs must be uploaded AND all uploaded docs must be approved
  const allRequiredDocsUploaded = REQUIRED_DOCS.every(docType => {
    const doc = getDocByType(docType);
    return doc && doc.url;
  });
  const allUploadedDocsApproved = onboardingProfile?.documents && onboardingProfile.documents.length > 0 && onboardingProfile.documents.every(d => d.status === 'APPROVED');
  const allDocsReady = allRequiredDocsUploaded && allUploadedDocsApproved && allB2BDocsReady;

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

  // Determine the role label — prefer Advisor model's allowedServices, fall back to conversion request
  const getTargetRoleLabel = () => {
    if (lead?.createdAdvisorId) {
      const advisorServices: string[] = typeof lead.createdAdvisorId === 'object' ? lead.createdAdvisorId.allowedServices || [] : [];
      if (advisorServices.length > 0) {
        return `Advisor (${advisorServices.map((s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')})`;
      }
      return 'Advisor';
    }
    if (lead?.createdAdminId) return 'Admin';
    const conv = lead?.conversionRequestId;
    if (conv && typeof conv === 'object') {
      if (conv.targetRole === 'Advisor' && conv.allowedServices?.length > 0) {
        return `Advisor (${conv.allowedServices.map((s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')})`;
      }
      return conv.targetRole || 'Advisor';
    }
    return 'Advisor';
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <B2BOpsLayout user={user}>
        <div className="p-8">
          {/* Back button */}
          <button onClick={() => router.push('/b2b-ops/leads')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Leads
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
          ) : !lead ? (
            <div className="text-center py-20"><p className="text-gray-500 text-lg">Lead not found</p></div>
          ) : (
            <div className="space-y-6">
              {/* Lead Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{getFullName(lead)}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStageColor(lead.stage)}`}>{lead.stage}</span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${lead.createdAdminId ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                        {getTargetRoleLabel()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500 block">Email</span><span className="font-medium">{lead.email}</span></div>
                  <div><span className="text-gray-500 block">Mobile</span><span className="font-medium">{lead.mobileNumber}</span></div>
                  <div><span className="text-gray-500 block">Created</span><span className="font-medium">{new Date(lead.createdAt).toLocaleDateString('en-GB')}</span></div>
                </div>
              </div>

              {/* Onboarding Profile */}
              {loadingOnboarding ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : !onboardingProfile ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <p className="text-center text-gray-500 py-8">Onboarding not started yet. The admin/advisor needs to complete their profile first.</p>
                </div>
              ) : (
                <>
                  {/* Company Details */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Company Details</h3>
                      {!editingCompany ? (
                        <button onClick={() => { setCompanyForm({ companyName: onboardingProfile.companyName || '', address: onboardingProfile.address || '' }); setEditingCompany(true); }} className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                          Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={handleSaveCompanyDetails} disabled={savingCompany} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {savingCompany ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingCompany(false)} className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCompany ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                          <input type="text" value={companyForm.companyName} onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                          <input type="text" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div><span className="text-gray-500 block">Company Name</span><span className="font-medium">{onboardingProfile.companyName || <span className="text-red-500 italic">Not filled</span>}</span></div>
                        <div><span className="text-gray-500 block">Address</span><span className="font-medium">{onboardingProfile.address || <span className="text-red-500 italic">Not filled</span>}</span></div>
                        <div><span className="text-gray-500 block">Onboarding Status</span><span className="font-medium">{onboardingProfile.isOnboarded ? <span className="text-green-600">Completed</span> : onboardingProfile.onboardingSubmittedAt ? <span className="text-blue-600">Submitted for Review</span> : <span className="text-yellow-600">In Progress</span>}</span></div>
                        {onboardingProfile.onboardingSubmittedAt && (
                          <div><span className="text-gray-500 block">Submitted At</span><span className="font-medium">{new Date(onboardingProfile.onboardingSubmittedAt).toLocaleDateString('en-GB')}</span></div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
                    <p className="text-sm text-gray-500 mb-6">Review and manage uploaded documents. You can also upload documents on behalf of the admin/advisor.</p>

                    <div className="space-y-4">
                      {ALL_DOC_TYPES.map((docType) => {
                        const doc = getDocByType(docType);
                        const isRequired = REQUIRED_DOCS.includes(docType);
                        const isUploading = uploadingDoc === docType;

                        return (
                          <div key={docType}>
                            <div className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 ${
                              doc
                                ? doc.status === 'APPROVED' ? 'border-green-300'
                                : doc.status === 'PENDING' ? 'border-yellow-300'
                                : 'border-red-300'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <svg className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-medium text-gray-900">{DOC_LABELS[docType] || docType}</h4>
                                      {isRequired && <span className="text-sm text-red-500 font-bold">*</span>}
                                    </div>
                                    {doc?.rejectReason && (
                                      <p className="text-sm text-red-600 mt-0.5">Reason: {doc.rejectReason}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {doc && <div className="shrink-0">{getStatusBadge(doc.status)}</div>}
                                  {doc?.url && (
                                    <>
                                      <button onClick={() => handleViewDocument(docType)} className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-blue-200 shadow-sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        View
                                      </button>
                                      <button onClick={() => handleDownloadOnboardingDoc(docType)} className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Download
                                      </button>
                                    </>
                                  )}
                                  <input ref={(el) => { fileInputRefs.current[docType] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadDocument(docType, file); e.target.value = ''; }} />
                                  <button onClick={() => fileInputRefs.current[docType]?.click()} disabled={isUploading} className="px-5 py-2.5 rounded-lg transition-all text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                                    </svg>
                                    {isUploading ? 'Uploading...' : doc ? 'Reupload' : 'Upload'}
                                  </button>
                                  {/* Approve/Reject for PENDING */}
                                  {doc?.status === 'PENDING' && (
                                    <>
                                      <button onClick={() => handleReviewDocument(docType, 'approve')} disabled={reviewingDoc === docType} className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm">
                                        {reviewingDoc === docType ? '...' : 'Approve'}
                                      </button>
                                      <button onClick={() => setRejectingDocType(rejectingDocType === docType ? null : docType)} className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 shadow-sm">
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Reject reason input */}
                            {rejectingDocType === docType && (
                              <div className="flex gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={`Reason for rejecting ${DOC_LABELS[docType] || docType}`} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                                <button onClick={() => handleReviewDocument(docType, 'reject')} disabled={!rejectReason.trim()} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">Confirm Reject</button>
                                <button onClick={() => { setRejectingDocType(null); setRejectReason(''); }} className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Document Stats */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center space-x-6 text-sm">
                        <span className="text-gray-600">Total: <strong>{ALL_DOC_TYPES.length}</strong></span>
                        <span className="text-green-600">Approved: <strong>{onboardingProfile.documents.filter(d => d.status === 'APPROVED').length}</strong></span>
                        <span className="text-yellow-600">Pending: <strong>{onboardingProfile.documents.filter(d => d.status === 'PENDING').length}</strong></span>
                        <span className="text-blue-600">Uploaded: <strong>{onboardingProfile.documents.length}</strong></span>
                        <span className="text-gray-400">Remaining: <strong>{ALL_DOC_TYPES.length - onboardingProfile.documents.length}</strong></span>
                      </div>
                    </div>
                  </div>

                  {lead.conversionStatus === 'PENDING' && lead.stage !== B2B_LEAD_STAGE.CONVERTED && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                      <svg className="w-6 h-6 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <p className="font-medium text-yellow-800">Approval Pending</p>
                        <p className="text-sm text-yellow-600">Approval request has been sent to Super Admin. Waiting for approval.</p>
                      </div>
                    </div>
                  )}

                  {lead.stage === B2B_LEAD_STAGE.CONVERTED && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <p className="font-medium text-green-800">Successfully Converted</p>
                        <p className="text-sm text-green-600">This lead has been converted and the account is fully active.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* B2B Lead Documents Section - always shown */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">B2B Lead Documents</h3>
                <p className="text-sm text-gray-500 mt-0.5">Documents required by this B2B lead. All fields are required.</p>
              </div>
              <button
                onClick={() => setShowAddField(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Document Field
              </button>
            </div>

            {/* Add Field Form */}
            {showAddField && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-3">New Document Field</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    placeholder="Document name (e.g. Franchise Agreement)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newFieldHelpText}
                    onChange={e => setNewFieldHelpText(e.target.value)}
                    placeholder="Help text (optional)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAddB2BDocField} disabled={addingField} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {addingField ? 'Adding...' : 'Add Field'}
                  </button>
                  <button onClick={() => { setShowAddField(false); setNewFieldName(''); setNewFieldHelpText(''); setNewFieldRequired(false); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingB2BDocs ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading documents...</div>
            ) : b2bDocFields.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No document fields yet. Click &ldquo;Add Document Field&rdquo; to create one.
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {b2bDocFields.map(field => {
                  const doc = getDocForField(field._id);
                  const isUploading = uploadingB2BDoc === field._id;
                  return (
                    <div key={field._id}>
                      <div className={`border-2 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 ${
                        doc
                          ? doc.status === B2BDocumentStatus.APPROVED ? 'border-green-300'
                          : doc.status === B2BDocumentStatus.PENDING ? 'border-yellow-300'
                          : 'border-red-300'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <svg className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-medium text-gray-900">{field.documentName}</h4>
                                {field.required && <span className="text-sm text-red-500 font-bold">*</span>}
                              </div>
                              {field.helpText && <p className="text-sm text-gray-500 mt-0.5">{field.helpText}</p>}
                              {doc?.rejectionMessage && <p className="text-sm text-red-600 mt-0.5">Reason: {doc.rejectionMessage}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {doc && <div className="shrink-0">{getB2BStatusBadge(doc.status)}</div>}
                            {doc && (
                              <>
                                <button onClick={() => handleViewB2BDocument(doc)} className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-blue-200 shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  View
                                </button>
                                <button onClick={() => handleDownloadB2BDocument(doc)} className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  Download
                                </button>
                              </>
                            )}
                            <input ref={el => { b2bFileInputRefs.current[field._id] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadB2BDocument(field, file); e.target.value = ''; }} />
                            <button onClick={() => b2bFileInputRefs.current[field._id]?.click()} disabled={isUploading} className="px-5 py-2.5 rounded-lg transition-all text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                              {isUploading ? 'Uploading...' : doc ? 'Reupload' : 'Upload'}
                            </button>
                            {doc?.status === B2BDocumentStatus.PENDING && (
                              <>
                                <button onClick={() => handleApproveB2BDocument(doc._id)} disabled={reviewingB2BDoc === doc._id} className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm">
                                  {reviewingB2BDoc === doc._id ? '...' : 'Approve'}
                                </button>
                                <button onClick={() => setRejectingB2BDocId(rejectingB2BDocId === doc._id ? null : doc._id)} className="px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 shadow-sm">
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {doc && rejectingB2BDocId === doc._id && (
                        <div className="flex gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <input type="text" value={b2bRejectMessage} onChange={e => setB2BRejectMessage(e.target.value)} placeholder="Reason for rejection" className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                          <button onClick={() => handleRejectB2BDocument(doc._id)} disabled={!b2bRejectMessage.trim()} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">Confirm Reject</button>
                          <button onClick={() => { setRejectingB2BDocId(null); setB2BRejectMessage(''); }} className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats */}
            {b2bDocFields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-6 text-sm">
                <span className="text-gray-600">Fields: <strong>{b2bDocFields.length}</strong></span>
                <span className="text-blue-600">Uploaded: <strong>{b2bDocuments.length}</strong></span>
                <span className="text-green-600">Approved: <strong>{b2bDocuments.filter(d => d.status === B2BDocumentStatus.APPROVED).length}</strong></span>
                <span className="text-yellow-600">Pending: <strong>{b2bDocuments.filter(d => d.status === B2BDocumentStatus.PENDING).length}</strong></span>
              </div>
            )}
          </div>

          {/* Request Final Approval - always at the bottom */}
          {lead && lead.stage !== B2B_LEAD_STAGE.CONVERTED && lead.conversionStatus !== 'APPROVED' && lead.conversionStatus !== 'PENDING' && onboardingProfile && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Final Approval</h3>
              {allDocsReady && onboardingProfile?.companyName && onboardingProfile?.address ? (
                <p className="text-sm text-gray-600 mb-4">All requirements are met. Request Super Admin approval to activate the account.</p>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Complete the following requirements to enable conversion:</p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      {onboardingProfile?.companyName ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                      <span className={onboardingProfile?.companyName ? 'text-green-700' : 'text-red-600'}>Company Name</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {onboardingProfile?.address ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                      <span className={onboardingProfile?.address ? 'text-green-700' : 'text-red-600'}>Address</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {allRequiredDocsUploaded ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                      <span className={allRequiredDocsUploaded ? 'text-green-700' : 'text-red-600'}>All required documents uploaded</span>
                    </li>
                    {b2bDocFields.length > 0 && (
                      <li className="flex items-center gap-2">
                        {allB2BDocsReady ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                        <span className={allB2BDocsReady ? 'text-green-700' : 'text-red-600'}>All B2B lead documents approved</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <button
                onClick={handleRequestApproval}
                disabled={converting || !allDocsReady || !onboardingProfile?.companyName || !onboardingProfile?.address}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {converting ? 'Requesting...' : 'Request Final Approval from Super Admin'}
              </button>
            </div>
          )}
        </div>
      </B2BOpsLayout>

      {/* B2B Document Viewer Modal */}
      {viewingB2BDoc && viewB2BBlobUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{viewingB2BDoc.documentName}</h3>
              <button onClick={closeB2BViewer} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingB2BDoc.mimeType.startsWith('image/') ? (
                <img src={viewB2BBlobUrl} alt={viewingB2BDoc.documentName} className="max-w-full mx-auto" />
              ) : viewingB2BDoc.mimeType === 'application/pdf' ? (
                <iframe src={viewB2BBlobUrl} className="w-full h-[70vh]" title={viewingB2BDoc.documentName} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Cannot preview this file type</p>
                  <a href={viewB2BBlobUrl} download className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Download</a>
                </div>
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
              <button onClick={closeViewer} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Cannot preview this file type</p>
                  <a href={viewBlobUrl} download className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Download</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
