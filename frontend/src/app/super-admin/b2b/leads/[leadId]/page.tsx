'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, b2bAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2B_LEAD_TYPE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';

interface B2BLeadDetail {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  type: string;
  stage: string;
  source: string;
  assignedB2BSalesId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  assignedB2BOpsId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  conversionStatus?: string;
  conversionRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

interface B2BFollowUp {
  _id: string;
  b2bLeadId: string;
  b2bSalesId: { userId: { firstName: string; lastName: string } };
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: string;
  status: string;
  stageAtFollowUp: string;
  stageChangedTo?: string;
  followUpNumber: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
}

interface B2BConversionHistory {
  _id: string;
  step: string;
  status: string;
  targetRole?: string;
  companyName?: string;
  companyAddress?: string;
  allowedServices?: string[];
  rejectionReason?: string;
  requestedBy: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  rejectedBy?: { firstName: string; lastName: string };
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

interface B2BSalesStaff {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
}

interface B2BOpsStaff {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
}

export default function SuperAdminB2BLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<B2BLeadDetail | null>(null);

  // Follow-ups
  const [followUps, setFollowUps] = useState<B2BFollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  // Conversion history
  const [conversions, setConversions] = useState<B2BConversionHistory[]>([]);
  const [loadingConversions, setLoadingConversions] = useState(false);

  // Assign Sales modal
  const [showAssignSalesModal, setShowAssignSalesModal] = useState(false);
  const [salesStaff, setSalesStaff] = useState<B2BSalesStaff[]>([]);
  const [selectedSalesId, setSelectedSalesId] = useState('');
  const [assigningSales, setAssigningSales] = useState(false);

  // Assign OPS modal
  const [showAssignOpsModal, setShowAssignOpsModal] = useState(false);
  const [opsStaff, setOpsStaff] = useState<B2BOpsStaff[]>([]);
  const [selectedOpsId, setSelectedOpsId] = useState('');
  const [assigningOps, setAssigningOps] = useState(false);

  // Stage update
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLead();
      fetchFollowUps();
      fetchConversions();
    }
  }, [user, leadId]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUps = async () => {
    try {
      setLoadingFollowUps(true);
      const response = await b2bAPI.getLeadFollowUpHistory(leadId);
      setFollowUps(response.data.data.followUps || []);
    } catch {
      console.error('Failed to fetch follow-ups');
    } finally {
      setLoadingFollowUps(false);
    }
  };

  const fetchConversions = async () => {
    try {
      setLoadingConversions(true);
      const response = await b2bAPI.getConversionHistory(leadId);
      setConversions(response.data.data.conversions || []);
    } catch {
      console.error('Failed to fetch conversions');
    } finally {
      setLoadingConversions(false);
    }
  };

  const getFullName = (u: { firstName: string; middleName?: string; lastName: string }) => {
    return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ');
  };

  const openAssignSalesModal = async () => {
    setSelectedSalesId(lead?.assignedB2BSalesId?._id || '');
    setShowAssignSalesModal(true);
    try {
      const response = await b2bAPI.getSalesStaff();
      setSalesStaff(response.data.data.salesStaff || []);
    } catch {
      toast.error('Failed to load sales staff');
    }
  };

  const handleAssignSales = async () => {
    try {
      setAssigningSales(true);
      await b2bAPI.assignSales(leadId, selectedSalesId || null);
      toast.success(selectedSalesId ? 'B2B Sales assigned' : 'B2B Sales unassigned');
      setShowAssignSalesModal(false);
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigningSales(false);
    }
  };

  const openAssignOpsModal = async () => {
    setSelectedOpsId(lead?.assignedB2BOpsId?._id || '');
    setShowAssignOpsModal(true);
    try {
      const response = await b2bAPI.getOpsStaff();
      setOpsStaff(response.data.data.opsStaff || []);
    } catch {
      toast.error('Failed to load OPS staff');
    }
  };

  const handleAssignOps = async () => {
    try {
      setAssigningOps(true);
      await b2bAPI.assignOps(leadId, selectedOpsId || null);
      toast.success(selectedOpsId ? 'B2B OPS assigned' : 'B2B OPS unassigned');
      setShowAssignOpsModal(false);
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigningOps(false);
    }
  };

  const handleStageUpdate = async (newStage: string) => {
    try {
      setUpdatingStage(true);
      await b2bAPI.updateLeadStage(leadId, newStage);
      toast.success(`Stage updated to ${newStage}`);
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case B2B_LEAD_STAGE.NEW: return 'bg-blue-100 text-blue-800';
      case B2B_LEAD_STAGE.HOT: return 'bg-red-100 text-red-800';
      case B2B_LEAD_STAGE.WARM: return 'bg-orange-100 text-orange-800';
      case B2B_LEAD_STAGE.COLD: return 'bg-cyan-100 text-cyan-800';
      case B2B_LEAD_STAGE.IN_PROCESS: return 'bg-purple-100 text-purple-800';
      case B2B_LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800';
      case B2B_LEAD_STAGE.CLOSED: return 'bg-gray-100 text-gray-800';
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

  const getConversionStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'DOCUMENT_VERIFICATION': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowUpStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Missed': return 'bg-red-100 text-red-800';
      case 'Rescheduled': return 'bg-orange-100 text-orange-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Stages that can be manually set (excluding In Process and Converted which need conversion flow)
  const manualStages = [
    B2B_LEAD_STAGE.NEW,
    B2B_LEAD_STAGE.HOT,
    B2B_LEAD_STAGE.WARM,
    B2B_LEAD_STAGE.COLD,
    B2B_LEAD_STAGE.CLOSED,
  ];

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Back button & Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/super-admin/b2b/leads')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to B2B Leads
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner"></div>
            </div>
          ) : !lead ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">Lead not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Lead Info Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{getFullName(lead)}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getTypeColor(lead.type)}`}>
                        {lead.type}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                        {lead.stage}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openAssignSalesModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      {lead.assignedB2BSalesId ? 'Reassign Sales' : 'Assign Sales'}
                    </button>
                    {lead.stage === B2B_LEAD_STAGE.IN_PROCESS && (
                      <button
                        onClick={openAssignOpsModal}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        {lead.assignedB2BOpsId ? 'Reassign OPS' : 'Assign OPS'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-gray-900 mt-1">{lead.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-gray-900 mt-1">{lead.mobileNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Source</p>
                    <p className="text-sm text-gray-900 mt-1">{lead.source || 'B2B Enquiry Form'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned B2B Sales</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {lead.assignedB2BSalesId?.userId
                        ? getFullName(lead.assignedB2BSalesId.userId)
                        : <span className="text-gray-400">Not assigned</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned B2B OPS</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {lead.assignedB2BOpsId?.userId
                        ? getFullName(lead.assignedB2BOpsId.userId)
                        : <span className="text-gray-400">Not assigned</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(lead.createdAt).toLocaleDateString('en-GB')} at{' '}
                      {new Date(lead.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Stage Update */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Update Stage</p>
                  <div className="flex flex-wrap gap-2">
                    {manualStages.map((stage) => (
                      <button
                        key={stage}
                        onClick={() => handleStageUpdate(stage)}
                        disabled={updatingStage || lead.stage === stage}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          lead.stage === stage
                            ? 'bg-blue-600 text-white cursor-default'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                    <span className="px-3 py-1.5 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg">
                      In Process / Converted — via conversion flow only
                    </span>
                  </div>
                </div>
              </div>

              {/* Follow-Up History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Follow-Up History</h3>
                  <p className="text-sm text-gray-500 mt-1">View-only — follow-ups are managed by B2B Sales</p>
                </div>
                {loadingFollowUps ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="spinner"></div>
                  </div>
                ) : followUps.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No follow-ups scheduled yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {followUps.map((followUp) => (
                      <div key={followUp._id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">#{followUp.followUpNumber}</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getFollowUpStatusColor(followUp.status)}`}>
                              {followUp.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(followUp.scheduledDate).toLocaleDateString('en-GB')} at {followUp.scheduledTime}
                            </span>
                            <span className="text-xs text-gray-400">({followUp.duration} min, {followUp.meetingType})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {followUp.stageChangedTo && (
                              <span className="text-xs text-gray-500">
                                Stage → <span className="font-medium">{followUp.stageChangedTo}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {followUp.notes && (
                          <p className="text-sm text-gray-600 mt-2 ml-8">{followUp.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversion History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Conversion History</h3>
                </div>
                {loadingConversions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="spinner"></div>
                  </div>
                ) : conversions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No conversion requests yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {conversions.map((conversion) => (
                      <div key={conversion._id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                              conversion.step === 'TO_IN_PROCESS'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {conversion.step === 'TO_IN_PROCESS' ? 'To In Process' : `To ${conversion.targetRole}`}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getConversionStatusColor(conversion.status)}`}>
                              {conversion.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(conversion.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <span>Requested by: {conversion.requestedBy?.firstName} {conversion.requestedBy?.lastName}</span>
                          {conversion.companyName && <span className="ml-4">Company: {conversion.companyName}</span>}
                          {conversion.allowedServices && conversion.allowedServices.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {conversion.allowedServices.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{s}</span>
                              ))}
                            </div>
                          )}
                          {conversion.rejectionReason && (
                            <p className="mt-1 text-red-600 text-sm">Rejection: {conversion.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Assign Sales Modal */}
        {showAssignSalesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAssignSalesModal(false)}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign B2B Sales</h3>
              <select
                value={selectedSalesId}
                onChange={(e) => setSelectedSalesId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
              >
                <option value="">Unassign</option>
                {salesStaff.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.userId.firstName} {staff.userId.lastName} — {staff.userId.email}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAssignSalesModal(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleAssignSales} disabled={assigningSales} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {assigningSales ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign OPS Modal */}
        {showAssignOpsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAssignOpsModal(false)}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign B2B OPS</h3>
              <select
                value={selectedOpsId}
                onChange={(e) => setSelectedOpsId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 mb-4"
              >
                <option value="">Unassign</option>
                {opsStaff.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.userId.firstName} {staff.userId.lastName} — {staff.userId.email}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAssignOpsModal(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleAssignOps} disabled={assigningOps} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {assigningOps ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}
