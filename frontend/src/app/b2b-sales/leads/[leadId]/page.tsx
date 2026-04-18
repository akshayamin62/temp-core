'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, b2bAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2B_LEAD_TYPE, FOLLOWUP_STATUS, MEETING_TYPE, FollowUp, LEAD_STAGE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import FollowUpCalendar from '@/components/FollowUpCalendar';
import FollowUpSidebar from '@/components/FollowUpSidebar';
import B2BFollowUpFormPanel from '@/components/B2BFollowUpFormPanel';
import B2BSalesLayout from '@/components/B2BSalesLayout';

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

export default function B2BSalesLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [requestingConversion, setRequestingConversion] = useState(false);

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
  useEffect(() => { if (user) { fetchLead(); fetchFollowUps(); } }, [user, leadId]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.B2B_SALES) {
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
        router.push('/b2b-sales/leads');
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

  const handleStageChange = async (newStage: string) => {
    if (!lead || lead.stage === newStage) return;
    if (newStage === B2B_LEAD_STAGE.CONVERTED || newStage === B2B_LEAD_STAGE.IN_PROCESS) {
      toast.error('Use the conversion buttons to change to this stage.');
      return;
    }
    try {
      setUpdatingStage(true);
      await b2bAPI.updateLeadStage(leadId, newStage);
      toast.success('Stage updated successfully');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleRequestConversion = async () => {
    if (!lead) return;
    try {
      setRequestingConversion(true);
      await b2bAPI.requestInProcessConversion(leadId);
      toast.success('Conversion request submitted. Awaiting Super Admin approval.');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request conversion');
    } finally {
      setRequestingConversion(false);
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
      <B2BSalesLayout user={user}>
        <div className="p-8">
          {/* Back Button & Header */}
          <div className="mb-6">
            <button onClick={() => router.push('/b2b-sales/leads')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Leads
            </button>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{leadName}</h2>
                <p className="text-gray-600 mt-1">B2B Lead Details</p>
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
                  <label className="block text-xs font-bold text-gray-500 mb-1">Submitted On</label>
                  <p className="text-gray-900">{new Date(lead.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {lead.companyName && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Company Name</label>
                    <p className="text-gray-900 font-medium">{lead.companyName}</p>
                  </div>
                )}
                {lead.designation && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Designation</label>
                    <p className="text-gray-900 font-medium">{lead.designation}</p>
                  </div>
                )}
              </div>
              {lead.notes && (
                <>
                  <hr className="my-4 border-gray-200" />
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Notes</label>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Stage + Type */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Stage</h3>
                {lead.stage === B2B_LEAD_STAGE.CONVERTED ? (
                  <div className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium ${getStageColor(lead.stage)}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      {lead.stage}
                    </div>
                    <p className="text-xs mt-1 opacity-75">Stage locked - Lead converted</p>
                  </div>
                ) : lead.stage === B2B_LEAD_STAGE.IN_PROCESS ? (
                  <div className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium ${getStageColor(lead.stage)}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Proceed for Documentation
                    </div>
                    <p className="text-xs mt-1">Assigned to B2B OPS for verification</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <select value={lead.stage} onChange={(e) => handleStageChange(e.target.value)} disabled={updatingStage} className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 ${getStageColor(lead.stage)}`}>
                        {Object.values(B2B_LEAD_STAGE).filter(s => s !== B2B_LEAD_STAGE.CONVERTED && s !== B2B_LEAD_STAGE.IN_PROCESS).map((stage) => (
                          <option key={stage} value={stage} className="bg-white text-gray-900">{stage}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    {[B2B_LEAD_STAGE.NEW, B2B_LEAD_STAGE.HOT, B2B_LEAD_STAGE.WARM].includes(lead.stage as B2B_LEAD_STAGE) && !lead.conversionStatus && (
                      <button onClick={handleRequestConversion} disabled={requestingConversion} className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                        {requestingConversion ? 'Requesting...' : '→ Proceed for Documentation'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Lead Type</h3>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(lead.type)}`}>{lead.type}</span>
              </div>

              {lead.conversionStatus && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Conversion Status</h3>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${lead.conversionStatus === 'Pending' || lead.conversionStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : lead.conversionStatus === 'Approved' || lead.conversionStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : lead.conversionStatus === 'DOCUMENT_VERIFICATION' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{lead.conversionStatus === 'DOCUMENT_VERIFICATION' ? 'Document Verification' : lead.conversionStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Follow-Up Calendar and Overview */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <FollowUpCalendar followUps={adaptedFollowUps} onFollowUpSelect={handleFollowUpClick} leadName={leadName} />
            </div>
            <div className="lg:col-span-1">
              <FollowUpSidebar today={todayFollowUps} missed={missedFollowUps} upcoming={upcomingFollowUps} onFollowUpClick={handleFollowUpClick} leadName={leadName} basePath="/b2b-sales/leads" showLeadLink={false} />
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
      </B2BSalesLayout>

      <B2BFollowUpFormPanel followUp={selectedFollowUp} isOpen={showFollowUpPanel} onClose={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); }} onSave={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); fetchFollowUps(); fetchLead(); }} />
    </>
  );
}
