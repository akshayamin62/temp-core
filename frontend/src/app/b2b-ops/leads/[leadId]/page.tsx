'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, b2bAPI, serviceAPI, onboardingAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2B_LEAD_TYPE, FOLLOWUP_STATUS, MEETING_TYPE, FollowUp, LEAD_STAGE, Service, OnboardingProfile, OnboardingDocument } from '@/types';
import B2BOpsLayout from '@/components/B2BOpsLayout';
import { BACKEND_URL } from '@/lib/ivyApi';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import FollowUpCalendar from '@/components/FollowUpCalendar';
import FollowUpSidebar from '@/components/FollowUpSidebar';
import B2BFollowUpFormPanel from '@/components/B2BFollowUpFormPanel';

// Adapter: map B2B follow-up data to FollowUp shape for calendar/sidebar components
function adaptB2BFollowUps(b2bFollowUps: any[]): FollowUp[] {
  return b2bFollowUps.map((fu: any) => {
    const lead = fu.b2bLeadId || {};
    const leadName = [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ');
    const stageMap: Record<string, string> = {
      [B2B_LEAD_STAGE.NEW]: LEAD_STAGE.NEW,
      [B2B_LEAD_STAGE.HOT]: LEAD_STAGE.HOT,
      [B2B_LEAD_STAGE.WARM]: LEAD_STAGE.WARM,
      [B2B_LEAD_STAGE.COLD]: LEAD_STAGE.COLD,
      [B2B_LEAD_STAGE.CONVERTED]: LEAD_STAGE.CONVERTED,
      [B2B_LEAD_STAGE.CLOSED]: LEAD_STAGE.CLOSED,
    };
    return {
      ...fu,
      leadId: {
        _id: lead._id || '',
        name: leadName,
        email: lead.email || '',
        mobileNumber: lead.mobileNumber || '',
        stage: stageMap[lead.stage] || lead.stage || LEAD_STAGE.NEW,
        serviceTypes: [],
        createdAt: lead.createdAt || '',
      },
    };
  });
}

export default function B2BOpsLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  // Onboarding review
  const [showOnboardingReview, setShowOnboardingReview] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [reviewingDoc, setReviewingDoc] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingDocType, setRejectingDocType] = useState<string | null>(null);
  const [requestingFinalApproval, setRequestingFinalApproval] = useState(false);

  // Follow-ups
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ date: '', time: '', duration: 30, meetingType: MEETING_TYPE.ONLINE });
  const [scheduling, setScheduling] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{ checked: boolean; available: boolean; message: string } | null>(null);

  // Follow-up panel
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);

  // Sidebar categorization
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [missedFollowUps, setMissedFollowUps] = useState<FollowUp[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (user) { fetchLead(); fetchFollowUps(); fetchServices(); } }, [user, leadId]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchLead = async () => {
    try {
      const response = await b2bAPI.getLeadDetail(leadId);
      setLead(response.data.data.lead);
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Lead not found or access denied');
        router.push('/b2b-ops/leads');
      } else {
        toast.error('Failed to fetch lead details');
      }
    }
  };

  const fetchFollowUps = async () => {
    try {
      setLoadingFollowUps(true);
      const response = await b2bAPI.getLeadFollowUpHistory(leadId);
      const allFollowUps = response.data.data.followUps || [];
      setFollowUps(allFollowUps);

      const adapted = adaptB2BFollowUps(allFollowUps);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayList: FollowUp[] = [];
      const missedList: FollowUp[] = [];
      const upcomingList: FollowUp[] = [];

      adapted.forEach((fu) => {
        const fuDate = new Date(fu.scheduledDate);
        fuDate.setHours(0, 0, 0, 0);
        if (fu.status === FOLLOWUP_STATUS.SCHEDULED) {
          if (fuDate.getTime() === today.getTime()) todayList.push(fu);
          else if (fuDate < today) missedList.push(fu);
          else upcomingList.push(fu);
        }
      });

      setTodayFollowUps(todayList);
      setMissedFollowUps(missedList);
      setUpcomingFollowUps(upcomingList);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await serviceAPI.getAllServices();
      setServices(response.data.data?.services || response.data.services || []);
    } catch {
      console.error('Failed to fetch services');
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
    } catch (error: any) {
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
        documentType: docType,
        action,
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

  const handleRequestFinalApproval = async () => {
    if (!lead) return;
    try {
      setRequestingFinalApproval(true);
      await b2bAPI.requestAdminAdvisorConversion(leadId);
      toast.success('Final approval request submitted to Super Admin');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request final approval');
    } finally {
      setRequestingFinalApproval(false);
    }
  };

  const checkAvailability = async () => {
    if (!newFollowUp.date || !newFollowUp.time) { toast.error('Please select date and time first'); return; }
    try {
      setCheckingAvailability(true);
      const response = await b2bAPI.checkTimeSlotAvailability({ date: newFollowUp.date, time: newFollowUp.time, duration: newFollowUp.duration });
      const { isAvailable, conflictingTime, conflictingLead } = response.data.data;
      if (!isAvailable) {
        const msg = `Time slot conflicts with follow-up at ${conflictingTime}${conflictingLead ? ` for ${conflictingLead}` : ''}`;
        setAvailabilityStatus({ checked: true, available: false, message: `✗ ${msg}` });
        toast.error(msg);
      } else {
        setAvailabilityStatus({ checked: true, available: true, message: '✓ Time slot is available!' });
        toast.success('Time slot is available!');
      }
    } catch {
      toast.error('Failed to check availability');
      setAvailabilityStatus(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!newFollowUp.date || !newFollowUp.time) { toast.error('Please select date and time'); return; }
    try {
      setScheduling(true);
      await b2bAPI.createFollowUp({ b2bLeadId: leadId, scheduledDate: newFollowUp.date, scheduledTime: newFollowUp.time, duration: newFollowUp.duration, meetingType: newFollowUp.meetingType });
      toast.success('Follow-up scheduled successfully');
      setShowScheduleForm(false);
      setNewFollowUp({ date: '', time: '', duration: 30, meetingType: MEETING_TYPE.ONLINE });
      setAvailabilityStatus(null);
      fetchFollowUps();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setScheduling(false);
    }
  };

  const handleFollowUpClick = (followUp: any) => {
    const original = followUps.find((fu: any) => fu._id === followUp._id);
    setSelectedFollowUp(original || followUp);
    setShowFollowUpPanel(true);
  };

  const getLeadFullName = (l: any) => [l.firstName, l.middleName, l.lastName].filter(Boolean).join(' ');

  const getStageColor = (stage: string) => {
    switch (stage) {
      case B2B_LEAD_STAGE.NEW: return 'bg-blue-100 text-blue-800 border-blue-200';
      case B2B_LEAD_STAGE.HOT: return 'bg-red-100 text-red-800 border-red-200';
      case B2B_LEAD_STAGE.WARM: return 'bg-orange-100 text-orange-800 border-orange-200';
      case B2B_LEAD_STAGE.COLD: return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case B2B_LEAD_STAGE.IN_PROCESS: return 'bg-purple-100 text-purple-800 border-purple-200';
      case B2B_LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800 border-green-200';
      case B2B_LEAD_STAGE.CLOSED: return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getFollowUpStatusColor = (status: string) => {
    switch (status) {
      case FOLLOWUP_STATUS.SCHEDULED: return 'bg-blue-100 text-blue-800';
      case FOLLOWUP_STATUS.INTERESTED_NEED_TIME:
      case FOLLOWUP_STATUS.INTERESTED_DISCUSSING: return 'bg-green-100 text-green-800';
      case FOLLOWUP_STATUS.NOT_INTERESTED:
      case FOLLOWUP_STATUS.NOT_REQUIRED:
      case FOLLOWUP_STATUS.REPEATEDLY_NOT_RESPONDING: return 'bg-gray-200 text-gray-700';
      case FOLLOWUP_STATUS.CALL_NOT_ANSWERED:
      case FOLLOWUP_STATUS.PHONE_SWITCHED_OFF:
      case FOLLOWUP_STATUS.NUMBER_BUSY:
      case FOLLOWUP_STATUS.CALL_DISCONNECTED: return 'bg-yellow-100 text-yellow-800';
      case FOLLOWUP_STATUS.CALL_BACK_LATER:
      case FOLLOWUP_STATUS.BUSY_RESCHEDULE: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canConvert = lead?.stage === B2B_LEAD_STAGE.IN_PROCESS && (lead?.createdAdminId || lead?.createdAdvisorId) && lead?.conversionStatus !== 'PENDING';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !lead) return null;

  const leadName = getLeadFullName(lead);
  const adaptedFollowUps = adaptB2BFollowUps(followUps);

  return (
    <>
      <Toaster position="top-right" />
      <B2BOpsLayout user={user}>
        <div className="p-8">
          {/* Back Button & Header */}
          <div className="mb-6">
            <button onClick={() => router.push('/b2b-ops/leads')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Leads
            </button>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{leadName}</h2>
                <p className="text-gray-600 mt-1">B2B Lead Details (OPS)</p>
              </div>
              <div className="flex gap-2">
                <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Send Email
                </a>
                <a href={`https://wa.me/${lead.mobileNumber?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
                {canConvert && (
                  <button onClick={() => router.push(`/b2b-ops/leads/${leadId}/verify`)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    View Onboarding
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Contact Information */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Mobile Number</label>
                  <a href={`tel:${lead.mobileNumber}`} className="text-blue-600 hover:underline font-medium">{lead.mobileNumber}</a>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline text-sm break-all">{lead.email}</a>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">City</label>
                  <p className="text-gray-900 font-medium">{lead.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Target Conversion</label>
                  <p className="text-gray-900 font-medium">{lead.type === B2B_LEAD_TYPE.ADVISOR ? 'Advisor' : 'Admin'} (from {lead.type})</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Submitted On</label>
                  <p className="text-gray-900">{new Date(lead.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Stage + Type */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Stage</h3>
                <div className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium ${getStageColor(lead.stage)}`}>
                  <div className="flex items-center gap-2">
                    {lead.stage === B2B_LEAD_STAGE.IN_PROCESS && <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    {lead.stage === B2B_LEAD_STAGE.CONVERTED && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    {lead.stage}
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/b2b-ops/leads/${leadId}/verify`)}
                  className="mt-3 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300 transition-colors text-sm font-medium"
                >
                  View Profile
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Lead Type</h3>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(lead.type)}`}>{lead.type}</span>
                {(() => {
                  const targetRole = lead.createdAdvisorId ? 'Advisor' : lead.createdAdminId ? 'Admin' : (lead.conversionRequestId && typeof lead.conversionRequestId === 'object' ? lead.conversionRequestId.targetRole : null);
                  const services: string[] = (lead.createdAdvisorId && typeof lead.createdAdvisorId === 'object' ? lead.createdAdvisorId.allowedServices : null) || (lead.conversionRequestId && typeof lead.conversionRequestId === 'object' ? lead.conversionRequestId.allowedServices : null) || [];
                  if (!targetRole) return null;
                  const showRoleBadge = targetRole !== lead.type;
                  if (!showRoleBadge && services.length === 0) return null;
                  return (
                    <div className="mt-2">
                      {showRoleBadge && (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${targetRole === 'Admin' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}`}>
                          {targetRole}
                        </span>
                      )}
                      {targetRole === 'Advisor' && services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {services.map((s: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200">
                              {s.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Onboarding Review Panel */}
          {showOnboardingReview && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border-2 border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Onboarding Review — {lead.type === B2B_LEAD_TYPE.ADVISOR ? 'Advisor' : 'Admin'}</h3>
                <button onClick={() => setShowOnboardingReview(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {loadingOnboarding ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : !onboardingProfile ? (
                <p className="text-gray-500 text-center py-6">No onboarding profile found. The account may not have been created yet.</p>
              ) : (
                <div className="space-y-6">
                  {/* Profile Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Company Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Company Name:</span> <span className="font-medium">{onboardingProfile.companyName || <span className="text-red-500 italic">Not filled</span>}</span></div>
                      <div><span className="text-gray-500">Slug:</span> <span className="font-medium">{onboardingProfile.enquiryFormSlug || <span className="text-red-500 italic">Not filled</span>}</span></div>
                      <div><span className="text-gray-500">Address:</span> <span className="font-medium">{onboardingProfile.address || '-'}</span></div>
                      <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{onboardingProfile.mobileNumber || '-'}</span></div>
                      <div><span className="text-gray-500">Email:</span> <span className="font-medium">{onboardingProfile.email}</span></div>
                      <div><span className="text-gray-500">Submitted:</span> <span className="font-medium">{onboardingProfile.onboardingSubmittedAt ? new Date(onboardingProfile.onboardingSubmittedAt).toLocaleString() : <span className="text-yellow-600 italic">Not yet submitted</span>}</span></div>
                    </div>
                  </div>

                  {/* Documents Review */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Documents</h4>
                    {onboardingProfile.documents.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No documents uploaded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {onboardingProfile.documents.map((doc) => (
                          <div key={doc.type} className={`border rounded-lg p-4 ${doc.status === 'REJECTED' ? 'border-red-300 bg-red-50' : doc.status === 'APPROVED' ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900 capitalize">{doc.type.replace(/-/g, ' ')}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' : doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{doc.status}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.url && (
                                  <a href={`${BACKEND_URL}/${doc.url.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View</a>
                                )}
                                {doc.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleReviewDocument(doc.type, 'approve')}
                                      disabled={reviewingDoc === doc.type}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {reviewingDoc === doc.type ? '...' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => setRejectingDocType(rejectingDocType === doc.type ? null : doc.type)}
                                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {doc.status === 'REJECTED' && doc.rejectReason && (
                              <p className="text-sm text-red-600 mt-2">Reason: {doc.rejectReason}</p>
                            )}
                            {rejectingDocType === doc.type && (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Reason for rejection"
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                />
                                <button
                                  onClick={() => handleReviewDocument(doc.type, 'reject')}
                                  disabled={reviewingDoc === doc.type || !rejectReason.trim()}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                  Confirm Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Request Final Approval */}
                  {onboardingProfile.onboardingSubmittedAt && onboardingProfile.documents.every(d => d.status === 'APPROVED') && lead.conversionStatus !== 'PENDING' && (
                    <div className="border-t border-gray-200 pt-4">
                      <button
                        onClick={handleRequestFinalApproval}
                        disabled={requestingFinalApproval}
                        className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        {requestingFinalApproval ? 'Requesting...' : 'Request Final Approval from Super Admin'}
                      </button>
                      <p className="text-xs text-gray-500 mt-1 text-center">All documents are approved. Request Super Admin to grant full access.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Follow-Up Calendar and Overview */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <FollowUpCalendar followUps={adaptedFollowUps} onFollowUpSelect={handleFollowUpClick} leadName={leadName} />
            </div>
            <div className="lg:col-span-1">
              <FollowUpSidebar today={todayFollowUps} missed={missedFollowUps} upcoming={upcomingFollowUps} onFollowUpClick={handleFollowUpClick} leadName={leadName} basePath="/b2b-ops/leads" showLeadLink={false} />
            </div>
          </div>

          {/* Follow-Up History */}
          <div className="mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Follow-Up History</h3>
                <button onClick={() => setShowScheduleForm(!showScheduleForm)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Schedule Follow-Up
                </button>
              </div>

              {/* Schedule Form */}
              {showScheduleForm && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input type="date" value={newFollowUp.date} onChange={(e) => { setNewFollowUp({ ...newFollowUp, date: e.target.value }); setAvailabilityStatus(null); }} min={format(new Date(), 'yyyy-MM-dd')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                      <input type="time" value={newFollowUp.time} onChange={(e) => { setNewFollowUp({ ...newFollowUp, time: e.target.value }); setAvailabilityStatus(null); }} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                      <select value={newFollowUp.duration} onChange={(e) => { setNewFollowUp({ ...newFollowUp, duration: parseInt(e.target.value) }); setAvailabilityStatus(null); }} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Type</label>
                      <select value={newFollowUp.meetingType} onChange={(e) => setNewFollowUp({ ...newFollowUp, meetingType: e.target.value as MEETING_TYPE })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value={MEETING_TYPE.ONLINE}>Online</option><option value={MEETING_TYPE.FACE_TO_FACE}>Face to Face</option>
                      </select>
                    </div>
                  </div>
                  {availabilityStatus && (
                    <div className={`mb-3 p-2 rounded-lg text-sm font-medium ${availabilityStatus.available ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>{availabilityStatus.message}</div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <button onClick={checkAvailability} disabled={checkingAvailability || !newFollowUp.date || !newFollowUp.time} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                      {checkingAvailability ? 'Checking...' : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Check Availability</>)}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowScheduleForm(false); setAvailabilityStatus(null); }} className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                      <button onClick={handleScheduleFollowUp} disabled={scheduling} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">{scheduling ? 'Scheduling...' : 'Schedule'}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-Up History List */}
              <div className="space-y-3">
                {loadingFollowUps ? (
                  <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
                ) : followUps.length > 0 ? (
                  followUps.map((followUp: any, index: number) => (
                    <div key={followUp._id} onClick={() => handleFollowUpClick(followUp)} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 hover:shadow-sm transition-all">
                      <div className={`w-2 h-2 mt-2 rounded-full ${followUp.status === FOLLOWUP_STATUS.SCHEDULED ? 'bg-blue-500' : followUp.status === FOLLOWUP_STATUS.INTERESTED_NEED_TIME || followUp.status === FOLLOWUP_STATUS.INTERESTED_DISCUSSING ? 'bg-green-500' : followUp.status === FOLLOWUP_STATUS.NOT_INTERESTED || followUp.status === FOLLOWUP_STATUS.NOT_REQUIRED ? 'bg-gray-500' : 'bg-yellow-500'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{format(new Date(followUp.scheduledDate), 'dd/MM/yyyy')} at {followUp.scheduledTime}</span>
                          {followUp.meetingType && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{followUp.meetingType}</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getFollowUpStatusColor(followUp.status)}`}>{followUp.status}</span>
                        </div>
                        {followUp.notes && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{followUp.notes}</p>}
                        {followUp.stageChangedTo && <p className="text-xs text-gray-500 mt-1">Stage changed to: <span className="font-medium">{followUp.stageChangedTo}</span></p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{followUp.duration} min</span>
                        {index === 0 ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-6">No follow-ups scheduled yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </B2BOpsLayout>

      <B2BFollowUpFormPanel followUp={selectedFollowUp} isOpen={showFollowUpPanel} onClose={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); }} onSave={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); fetchFollowUps(); fetchLead(); }} />
    </>
  );
}
