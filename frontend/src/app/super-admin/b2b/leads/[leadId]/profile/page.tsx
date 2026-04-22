'use client';

import React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, b2bAPI, onboardingAPI } from '@/lib/api';
import { b2bLeadDocumentAPI } from '@/lib/b2bLeadDocumentAPI';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2BDocumentField, B2BLeadDocument } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import B2BProfileForm from '@/components/B2BProfileForm';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminB2BLeadProfilePage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any | null>(null);

  // Onboarding profile
  const [onboardingProfile, setOnboardingProfile] = useState<any | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);

  // B2B documents (fetched by adminId / advisorId)
  const [b2bDocFields, setB2BDocFields] = useState<B2BDocumentField[]>([]);
  const [b2bDocuments, setB2BDocuments] = useState<B2BLeadDocument[]>([]);
  const [loadingB2BDocs, setLoadingB2BDocs] = useState(false);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);

  // Edit mode state
  const [profileData, setProfileData] = useState<Record<string, string>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (user) fetchLead(); }, [user, leadId]);
  useEffect(() => {
    if (lead) {
      fetchOnboardingProfile();
      fetchB2BDocuments();
    }
  }, [lead?._id, lead?.createdAdminId, lead?.createdAdvisorId]);

  const getEntityId = (l: any): string | null => {
    const raw = l?.createdAdminId || l?.createdAdvisorId;
    if (!raw) return null;
    return typeof raw === 'object' && raw !== null ? raw._id : raw;
  };

  const checkAuth = async () => {
    try {
      const res = await authAPI.getProfile();
      const userData = res.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) { toast.error('Access denied.'); router.push('/'); return; }
      setUser(userData);
    } catch {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchLead = async () => {
    try {
      setLoading(true);
      const res = await b2bAPI.getLeadDetail(leadId);
      setLead(res.data.data.lead);
    } catch {
      toast.error('Failed to fetch lead details');
      router.push('/super-admin/b2b/leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchOnboardingProfile = async () => {
    if (!lead?.createdAdminId && !lead?.createdAdvisorId) return;
    const entityId = getEntityId(lead);
    if (!entityId) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      setLoadingOnboarding(true);
      const res = await onboardingAPI.getReview(entityId, role);
      setOnboardingProfile(res.data.data.profile);
      setProfileData(res.data.data.profile?.b2bProfileData || {});
    } catch {
      toast.error('Failed to load onboarding profile');
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const fetchB2BDocuments = async () => {
    const entityId = getEntityId(lead);
    if (!entityId) return;
    const isAdmin = !!lead.createdAdminId;
    try {
      setLoadingB2BDocs(true);
      const [fieldsRes, docsRes] = await Promise.all([
        isAdmin ? b2bLeadDocumentAPI.getFieldsByAdmin(entityId) : b2bLeadDocumentAPI.getFieldsByAdvisor(entityId),
        isAdmin ? b2bLeadDocumentAPI.getDocsByAdmin(entityId) : b2bLeadDocumentAPI.getDocsByAdvisor(entityId),
      ]);
      setB2BDocFields(fieldsRes.data.data.fields || []);
      setB2BDocuments(docsRes.data.data.documents || []);
    } catch {
      toast.error('Failed to load B2B documents');
    } finally {
      setLoadingB2BDocs(false);
    }
  };

  const handleApproveDoc = async (docId: string) => {
    try {
      setReviewingDocId(docId);
      await b2bLeadDocumentAPI.approveDocument(docId);
      toast.success('Document approved');
      await fetchB2BDocuments();
    } catch {
      toast.error('Failed to approve document');
    } finally {
      setReviewingDocId(null);
    }
  };

  const handleRejectDoc = async (docId: string, message: string) => {
    try {
      setReviewingDocId(docId);
      await b2bLeadDocumentAPI.rejectDocument(docId, message);
      toast.success('Document rejected');
      await fetchB2BDocuments();
    } catch {
      toast.error('Failed to reject document');
    } finally {
      setReviewingDocId(null);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSection = async (sectionId: string) => {
    const entityId = getEntityId(lead);
    if (!entityId) return;
    const role = lead.createdAdminId ? 'Admin' : 'Advisor';
    try {
      setSavingSection(sectionId);
      await onboardingAPI.updateB2BProfileByReviewer(entityId, { b2bProfileData: profileData, role });
      toast.success('Section saved');
    } catch {
      toast.error('Failed to save section');
    } finally {
      setSavingSection(null);
    }
  };

  const handleUploadDoc = async (field: B2BDocumentField, file: File) => {
    try {
      setUploadingDocId(field._id);
      await b2bLeadDocumentAPI.uploadDocument(null, field._id, field.documentKey, field.documentName, file);
      toast.success('Document uploaded');
      await fetchB2BDocuments();
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploadingDocId(null);
    }
  };

  const getFullName = (u: any) => [u?.firstName, u?.middleName, u?.lastName].filter(Boolean).join(' ');

  const getStageColor = (stage: string) => {
    switch (stage) {
      case B2B_LEAD_STAGE.IN_PROCESS: return 'bg-purple-100 text-purple-800';
      case B2B_LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  if (!user) return null;

  const b2bProfileData = profileData;
  const readonlyData = {
    firstName: lead?.firstName || '',
    lastName: lead?.lastName || '',
    email: lead?.email || '',
  };

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          <button onClick={() => router.push(`/super-admin/b2b/leads/${leadId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Lead Details
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
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
                        {lead.createdAdminId ? 'Admin' : 'Advisor'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500 block">Email</span><span className="font-medium">{lead.email}</span></div>
                  <div><span className="text-gray-500 block">Mobile</span><span className="font-medium">{lead.mobileNumber}</span></div>
                  <div><span className="text-gray-500 block">Created</span><span className="font-medium">{new Date(lead.createdAt).toLocaleDateString('en-GB')}</span></div>
                  {onboardingProfile && (
                    <div>
                      <span className="text-gray-500 block">Onboarding Status</span>
                      <span className="font-medium">
                        {onboardingProfile.isOnboarded
                          ? <span className="text-green-600">Completed</span>
                          : onboardingProfile.onboardingSubmittedAt
                          ? <span className="text-blue-600">Submitted for Review</span>
                          : <span className="text-yellow-600">In Progress</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* B2B Profile Form (read-only) + B2B Documents */}
              {loadingOnboarding ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : !onboardingProfile ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <p className="text-center text-gray-500 py-8">
                    Onboarding not started yet. The admin/advisor needs to complete their profile first.
                  </p>
                </div>
              ) : (
                <B2BProfileForm
                  profileData={b2bProfileData}
                  readonlyData={readonlyData}
                  b2bDocFields={b2bDocFields}
                  b2bDocuments={b2bDocuments}
                  loadingDocs={loadingB2BDocs}
                  readOnly={false}
                  savingSection={savingSection}
                  onFieldChange={handleFieldChange}
                  onSaveSection={handleSaveSection}
                  uploadingDocId={uploadingDocId}
                  onUploadDoc={handleUploadDoc}
                  canReviewDocs={true}
                  reviewingDocId={reviewingDocId}
                  onApproveDoc={handleApproveDoc}
                  onRejectDoc={handleRejectDoc}
                />
              )}

              {/* Conversion Status */}
              {lead.stage === B2B_LEAD_STAGE.CONVERTED && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800">Successfully Converted</p>
                    <p className="text-sm text-green-600">This lead has been converted and the account is fully active.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
