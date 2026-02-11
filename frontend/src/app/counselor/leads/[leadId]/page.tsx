'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, leadAPI, followUpAPI, leadConversionAPI, adminStudentAPI } from '@/lib/api';
import { User, USER_ROLE, Lead, LEAD_STAGE, SERVICE_TYPE, FollowUp, FOLLOWUP_STATUS, CONVERSION_STATUS, MEETING_TYPE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import FollowUpCalendar from '@/components/FollowUpCalendar';
import FollowUpSidebar from '@/components/FollowUpSidebar';
import FollowUpFormPanel from '@/components/FollowUpFormPanel';

export default function CounselorLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  
  // Stage update
  const [updatingStage, setUpdatingStage] = useState(false);
  
  // Conversion request
  const [requestingConversion, setRequestingConversion] = useState(false);
  
  // Follow-ups
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    date: '',
    time: '',
    duration: 30,
    meetingType: MEETING_TYPE.ONLINE,
  });
  const [scheduling, setScheduling] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  
  // Follow-up panel for editing
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);
  
  // For sidebar summary (today/missed/upcoming for this lead only)
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [missedFollowUps, setMissedFollowUps] = useState<FollowUp[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  // Student info for converted leads
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loadingStudentId, setLoadingStudentId] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLead();
      fetchFollowUps();
    }
  }, [user, leadId]);

  // Fetch student ID when lead is converted
  useEffect(() => {
    if (lead?.stage === LEAD_STAGE.CONVERTED && lead?.conversionStatus === CONVERSION_STATUS.APPROVED) {
      fetchStudentId();
    }
  }, [lead]);

  const fetchStudentId = async () => {
    try {
      setLoadingStudentId(true);
      const response = await adminStudentAPI.getStudentByLeadId(leadId);
      if (response.data.data.student) {
        setStudentId(response.data.data.student._id);
      }
    } catch (error) {
      console.error('Error fetching student ID:', error);
    } finally {
      setLoadingStudentId(false);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied. Counselor only.');
        router.push('/');
        return;
      }

      setUser(userData);
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchLead = async () => {
    try {
      const response = await leadAPI.getLeadDetail(leadId);
      setLead(response.data.data.lead);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Lead not found or access denied');
        router.push('/counselor/leads');
      } else {
        toast.error('Failed to fetch lead details');
      }
    }
  };

  const fetchFollowUps = async () => {
    try {
      setLoadingFollowUps(true);
      const response = await followUpAPI.getLeadFollowUpHistory(leadId);
      const allFollowUps = response.data.data.followUps || [];
      setFollowUps(allFollowUps);
      
      // Categorize follow-ups for sidebar
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      const todayList: FollowUp[] = [];
      const missedList: FollowUp[] = [];
      const upcomingList: FollowUp[] = [];
      
      allFollowUps.forEach((fu: FollowUp) => {
        const fuDate = new Date(fu.scheduledDate);
        fuDate.setHours(0, 0, 0, 0);
        
        if (fu.status === FOLLOWUP_STATUS.SCHEDULED) {
          if (fuDate.getTime() === today.getTime()) {
            todayList.push(fu);
          } else if (fuDate < today) {
            missedList.push(fu);
          } else if (fuDate.getTime() === tomorrow.getTime()) {
            upcomingList.push(fu);
          }
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
    
    // Prevent changing to CONVERTED - must use conversion flow
    if (newStage === LEAD_STAGE.CONVERTED) {
      toast.error('Please use the "Request Conversion" button to convert this lead to a student.');
      return;
    }

    try {
      setUpdatingStage(true);
      await leadAPI.updateLeadStage(lead._id, newStage);
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
      await leadConversionAPI.requestConversion(lead._id);
      toast.success('Conversion request submitted! Waiting for admin approval.');
      fetchLead();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request conversion');
    } finally {
      setRequestingConversion(false);
    }
  };

  const checkAvailability = async () => {
    if (!newFollowUp.date || !newFollowUp.time) {
      toast.error('Please select date and time first');
      return;
    }

    try {
      setCheckingAvailability(true);
      const response = await followUpAPI.checkTimeSlotAvailability({
        date: newFollowUp.date,
        time: newFollowUp.time,
        duration: newFollowUp.duration,
      });
      
      const { isAvailable, conflictingTime, conflictingLead } = response.data.data;
      
      let message = '';
      if (!isAvailable) {
        message = `✗ Conflict with follow-up at ${conflictingTime}${conflictingLead ? ` for ${conflictingLead}` : ''}`;
      } else {
        message = '✓ Time slot is available!';
      }
      
      setAvailabilityStatus({
        checked: true,
        available: isAvailable,
        message,
      });
      
      if (isAvailable) {
        toast.success('Time slot is available!');
      } else {
        toast.error(`Time slot conflicts with follow-up at ${conflictingTime}${conflictingLead ? ` for ${conflictingLead}` : ''}`);
      }
    } catch (error: any) {
      toast.error('Failed to check availability');
      setAvailabilityStatus(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!newFollowUp.date || !newFollowUp.time) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setScheduling(true);
      await followUpAPI.createFollowUp({
        leadId,
        scheduledDate: newFollowUp.date,
        scheduledTime: newFollowUp.time,
        duration: newFollowUp.duration,
        meetingType: newFollowUp.meetingType,
      });
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

  const handleFollowUpClick = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setShowFollowUpPanel(true);
  };

  const handleFollowUpPanelClose = () => {
    setShowFollowUpPanel(false);
    setSelectedFollowUp(null);
  };

  const handleFollowUpSave = () => {
    setShowFollowUpPanel(false);
    setSelectedFollowUp(null);
    fetchFollowUps();
    fetchLead(); // Refresh lead in case stage changed
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGE.NEW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case LEAD_STAGE.HOT:
        return 'bg-red-100 text-red-800 border-red-200';
      case LEAD_STAGE.WARM:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case LEAD_STAGE.COLD:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case LEAD_STAGE.CONVERTED:
        return 'bg-green-100 text-green-800 border-green-200';
      case LEAD_STAGE.CLOSED:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CARRER_FOCUS_STUDY_ABROAD:
        return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
        return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING:
        return 'bg-teal-100 text-teal-800';
      case SERVICE_TYPE.IELTS_GRE_LANGUAGE_COACHING:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFollowUpStatusColor = (status: FOLLOWUP_STATUS | string) => {
    switch (status) {
      case FOLLOWUP_STATUS.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      // Call Issues - Yellow/Orange
      case FOLLOWUP_STATUS.CALL_NOT_ANSWERED:
      case FOLLOWUP_STATUS.PHONE_SWITCHED_OFF:
      case FOLLOWUP_STATUS.OUT_OF_COVERAGE:
      case FOLLOWUP_STATUS.NUMBER_BUSY:
      case FOLLOWUP_STATUS.CALL_DISCONNECTED:
      case FOLLOWUP_STATUS.INCOMING_BARRED:
      case FOLLOWUP_STATUS.CALL_REJECTED:
        return 'bg-yellow-100 text-yellow-800';
      // Invalid - Red
      case FOLLOWUP_STATUS.INVALID_NUMBER:
      case FOLLOWUP_STATUS.FAKE_ENQUIRY:
      case FOLLOWUP_STATUS.DUPLICATE_ENQUIRY:
        return 'bg-red-100 text-red-800';
      // Reschedule - Orange
      case FOLLOWUP_STATUS.CALL_BACK_LATER:
      case FOLLOWUP_STATUS.BUSY_RESCHEDULE:
        return 'bg-orange-100 text-orange-800';
      // Interested - Green shades
      case FOLLOWUP_STATUS.DISCUSS_WITH_PARENTS:
      case FOLLOWUP_STATUS.RESPONDING_VAGUELY:
      case FOLLOWUP_STATUS.INTERESTED_NEED_TIME:
      case FOLLOWUP_STATUS.INTERESTED_DISCUSSING:
        return 'bg-green-100 text-green-800';
      // Not Interested - Gray
      case FOLLOWUP_STATUS.NOT_INTERESTED:
      case FOLLOWUP_STATUS.NOT_REQUIRED:
      case FOLLOWUP_STATUS.REPEATEDLY_NOT_RESPONDING:
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        <div className="p-8">
        {/* Back Button & Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/counselor/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-gray-600 mt-1">Lead Details</p>
            </div>
            {/* Quick Actions - Right side */}
            <div className="flex gap-2">
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </a>
              <a
                href={`https://wa.me/${lead.mobileNumber?.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Main Info Cards - 2 columns: Contact Info (2/3) | Stage+Services (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Contact Information Card - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Mobile Number</label>
                <a href={`tel:${lead.mobileNumber}`} className="text-blue-600 hover:underline font-medium">
                  {lead.mobileNumber}
                </a>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline text-sm break-all">
                  {lead.email}
                </a>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">City</label>
                <p className="text-gray-900 font-medium">{lead.city || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Submitted On</label>
                <p className="text-gray-900">
                  {new Date(lead.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Stage + Services stacked */}
          <div className="space-y-4">
            {/* Stage Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Stage</h3>
              
              {/* If already converted and approved - show locked state */}
              {lead.stage === LEAD_STAGE.CONVERTED && lead.conversionStatus === 'APPROVED' ? (
                <div className="space-y-3">
                  <div className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium ${getStageColor(lead.stage)}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {lead.stage}
                    </div>
                    <p className="text-xs mt-1 opacity-75">Stage locked - Lead converted to student</p>
                  </div>
                  
                  {/* View Student Info Button */}
                  {loadingStudentId ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  ) : studentId ? (
                    <button
                      onClick={() => router.push(`/counselor/students/${studentId}`)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View Student Info
                    </button>
                  ) : (
                    <p className="text-xs text-gray-500 text-center">Student data not available</p>
                  )}
                </div>
              ) : lead.conversionStatus === 'PENDING' ? (
                // Pending conversion - show status
                <div className="w-full px-3 py-2 rounded-lg border-2 text-sm font-medium bg-yellow-100 text-yellow-800 border-yellow-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Conversion Pending
                  </div>
                  <p className="text-xs mt-1">Waiting for admin approval</p>
                </div>
              ) : lead.conversionStatus === 'REJECTED' ? (
                // Rejected conversion - allow retry
                <div className="space-y-2">
                  <div className="w-full px-3 py-2 rounded-lg border-2 text-sm font-medium bg-red-100 text-red-800 border-red-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Conversion Rejected
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={lead.stage}
                      onChange={(e) => handleStageChange(e.target.value)}
                      disabled={updatingStage}
                      className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50 ${getStageColor(lead.stage)}`}
                    >
                      {Object.values(LEAD_STAGE).filter(s => s !== LEAD_STAGE.CONVERTED).map((stage) => (
                        <option key={stage} value={stage} className="bg-white text-gray-900">{stage}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestConversion}
                    disabled={requestingConversion}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {requestingConversion ? 'Requesting...' : 'Request Conversion Again'}
                  </button>
                </div>
              ) : (
                // Normal state - show dropdown and conversion button
                <div className="space-y-2">
                  <div className="relative">
                    <select
                      value={lead.stage}
                      onChange={(e) => handleStageChange(e.target.value)}
                      disabled={updatingStage}
                        className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 ${getStageColor(lead.stage)}`}
                    >
                      {Object.values(LEAD_STAGE).filter(s => s !== LEAD_STAGE.CONVERTED).map((stage) => (
                        <option key={stage} value={stage} className="bg-white text-gray-900">{stage}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      {updatingStage ? (
                        <svg className="w-4 h-4 animate-spin text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleRequestConversion}
                    disabled={requestingConversion}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {requestingConversion ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Requesting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Request Conversion to Student
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Services Interested Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Services Interested</h3>
              <div className="flex flex-wrap gap-1.5">
                {lead.serviceTypes?.map((service, idx) => (
                  <span key={idx} className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                    {service}
                  </span>
                )) || <span className="text-gray-500 text-sm">N/A</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-Up Calendar and Overview - Separate sections like dashboard */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Section */}
          <div className="lg:col-span-3">
            <FollowUpCalendar
              followUps={followUps}
              onFollowUpSelect={handleFollowUpClick}
              leadName={lead.name}
            />
          </div>

          {/* Sidebar Section */}
          <div className="lg:col-span-1">
            <FollowUpSidebar
              today={todayFollowUps}
              missed={missedFollowUps}
              upcoming={upcomingFollowUps}
              onFollowUpClick={handleFollowUpClick}
              leadName={lead.name}
            />
          </div>
        </div>

        {/* Follow-Ups History Section - Full Width */}
        <div className="mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Follow-Up History</h3>
                {followUps.length === 0 && (
                  <button
                    onClick={() => setShowScheduleForm(!showScheduleForm)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Schedule First Follow-Up
                  </button>
                )}
              </div>

              {/* Schedule Form - Only shown for first follow-up */}
              {showScheduleForm && followUps.length === 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={newFollowUp.date}
                        onChange={(e) => {
                          setNewFollowUp({ ...newFollowUp, date: e.target.value });
                          setAvailabilityStatus(null);
                        }}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                      <input
                        type="time"
                        value={newFollowUp.time}
                        onChange={(e) => {
                          setNewFollowUp({ ...newFollowUp, time: e.target.value });
                          setAvailabilityStatus(null);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                      <select
                        value={newFollowUp.duration}
                        onChange={(e) => {
                          setNewFollowUp({ ...newFollowUp, duration: parseInt(e.target.value) });
                          setAvailabilityStatus(null);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Type</label>
                      <select
                        value={newFollowUp.meetingType}
                        onChange={(e) => {
                          setNewFollowUp({ ...newFollowUp, meetingType: e.target.value as MEETING_TYPE });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={MEETING_TYPE.ONLINE}>Online</option>
                        <option value={MEETING_TYPE.FACE_TO_FACE}>Face to Face</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Availability Status */}
                  {availabilityStatus && (
                    <div className={`mb-3 p-2 rounded-lg text-sm font-medium ${
                      availabilityStatus.available 
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {availabilityStatus.message}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center gap-2">
                    <button
                      onClick={checkAvailability}
                      disabled={checkingAvailability || !newFollowUp.date || !newFollowUp.time}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {checkingAvailability ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Checking...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Check Availability
                        </>
                      )}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowScheduleForm(false);
                          setAvailabilityStatus(null);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleScheduleFollowUp}
                        disabled={scheduling}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {scheduling ? 'Scheduling...' : 'Schedule'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-Up History List */}
              <div className="space-y-3">
                {loadingFollowUps ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : followUps.length > 0 ? (
                  followUps.map((followUp, index) => {
                    const isLatestFollowUp = index === 0; // First item is latest (sorted by followUpNumber desc)
                    return (
                    <div 
                      key={followUp._id} 
                      onClick={() => handleFollowUpClick(followUp)}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 hover:shadow-sm transition-all"
                    >
                      <div className={`w-2 h-2 mt-2 rounded-full ${
                        followUp.status === FOLLOWUP_STATUS.SCHEDULED ? 'bg-blue-500' :
                        followUp.status === FOLLOWUP_STATUS.INTERESTED_NEED_TIME || 
                        followUp.status === FOLLOWUP_STATUS.INTERESTED_DISCUSSING ? 'bg-green-500' :
                        followUp.status === FOLLOWUP_STATUS.NOT_INTERESTED ||
                        followUp.status === FOLLOWUP_STATUS.NOT_REQUIRED ? 'bg-gray-500' :
                        'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {format(new Date(followUp.scheduledDate), 'MMM d, yyyy')} at {followUp.scheduledTime}
                          </span>
                          {followUp.meetingType && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                              {followUp.meetingType === MEETING_TYPE.ONLINE ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Online
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Face to Face
                                </>
                              )}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getFollowUpStatusColor(followUp.status)}`}>
                            {followUp.status}
                          </span>
                        </div>
                        {followUp.notes && (
                          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{followUp.notes}</p>
                        )}
                        {followUp.stageChangedTo && (
                          <p className="text-xs text-gray-500 mt-1">
                            Stage changed to: <span className="font-medium">{followUp.stageChangedTo}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{followUp.duration} min</span>
                        {/* Show edit icon only on latest follow-up */}
                        {isLatestFollowUp ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-6">No follow-ups scheduled yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Edit Panel */}
      <FollowUpFormPanel
        followUp={selectedFollowUp}
        isOpen={showFollowUpPanel}
        onClose={handleFollowUpPanelClose}
        onSave={handleFollowUpSave}
      />
    </>
  );
}
