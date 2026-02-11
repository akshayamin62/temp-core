'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, leadAPI, followUpAPI, adminStudentAPI } from '@/lib/api';
import { User, USER_ROLE, Lead, LEAD_STAGE, SERVICE_TYPE, FollowUp, FOLLOWUP_STATUS, CONVERSION_STATUS } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import FollowUpCalendar from '@/components/FollowUpCalendar';
import FollowUpSidebar from '@/components/FollowUpSidebar';
import FollowUpFormPanel from '@/components/FollowUpFormPanel';
import { getFullName } from '@/utils/nameHelpers';

export default function SuperAdminLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.leadId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);

  // Follow-ups (super admin is view-only)
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  
  // Follow-up panel for viewing
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

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin only.');
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
      if (error.response?.status === 404) {
        toast.error('Lead not found');
        router.back();
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
    fetchLead();
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
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      case FOLLOWUP_STATUS.CALL_NOT_ANSWERED:
      case FOLLOWUP_STATUS.PHONE_SWITCHED_OFF:
      case FOLLOWUP_STATUS.OUT_OF_COVERAGE:
      case FOLLOWUP_STATUS.NUMBER_BUSY:
      case FOLLOWUP_STATUS.CALL_DISCONNECTED:
      case FOLLOWUP_STATUS.INCOMING_BARRED:
      case FOLLOWUP_STATUS.CALL_REJECTED:
        return 'bg-yellow-100 text-yellow-800';
      case FOLLOWUP_STATUS.INVALID_NUMBER:
      case FOLLOWUP_STATUS.FAKE_ENQUIRY:
      case FOLLOWUP_STATUS.DUPLICATE_ENQUIRY:
        return 'bg-red-100 text-red-800';
      case FOLLOWUP_STATUS.CALL_BACK_LATER:
      case FOLLOWUP_STATUS.BUSY_RESCHEDULE:
        return 'bg-orange-100 text-orange-800';
      case FOLLOWUP_STATUS.DISCUSS_WITH_PARENTS:
      case FOLLOWUP_STATUS.RESPONDING_VAGUELY:
      case FOLLOWUP_STATUS.INTERESTED_NEED_TIME:
      case FOLLOWUP_STATUS.INTERESTED_DISCUSSING:
        return 'bg-green-100 text-green-800';
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
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Back Button & Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
                <p className="text-gray-600 mt-1">Lead Details (Read Only)</p>
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

          {/* Main Info Cards - 2 columns: Contact Info (2/3) | Stage+Services+Assignment (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Contact Information Card - Takes 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Mobile Number</label>
                  <a href={`tel:${lead.mobileNumber}`} className="text-teal-600 hover:underline font-medium">
                    {lead.mobileNumber}
                  </a>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                  <a href={`mailto:${lead.email}`} className="text-teal-600 hover:underline text-sm break-all">
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

            {/* Right Column - Stage + Services + Assignment stacked */}
            <div className="space-y-4">
              {/* Stage Card - View Only */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Stage</h3>
                <div className={`w-full px-3 py-2 rounded-lg border-2 text-sm font-medium ${getStageColor(lead.stage)}`}>
                  {lead.stage}
                </div>
                
                {/* View Student Info Button - Only for Converted & Approved leads */}
                {lead.stage === LEAD_STAGE.CONVERTED && lead.conversionStatus === CONVERSION_STATUS.APPROVED && (
                  <div className="mt-3">
                    {loadingStudentId ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    ) : studentId ? (
                      <button
                        onClick={() => router.push(`/super-admin/roles/student/${studentId}`)}
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

              {/* Assigned Counselor Card - Read Only */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Assigned Counselor</h3>
                {lead.assignedCounselorId ? (
                  <span className="text-gray-900 font-medium">
                    {getFullName(lead.assignedCounselorId?.userId) || 'Unknown'}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">Not assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Follow-Up Calendar and Overview - Separate sections like dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
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
                basePath="/super-admin/leads"
              />
            </div>
          </div>

          {/* Follow-Ups History Section - Full Width */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Follow-Up History</h3>
              </div>

              {/* Follow-Up History List */}
              <div className="space-y-3">
                {loadingFollowUps ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                  </div>
                ) : followUps.length > 0 ? (
                  followUps.map((followUp, index) => (
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
                        {/* Show view icon - view only */}
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
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
      </SuperAdminLayout>

      {/* Follow-up View Panel - Read Only */}
      <FollowUpFormPanel
        followUp={selectedFollowUp}
        isOpen={showFollowUpPanel}
        onClose={handleFollowUpPanelClose}
        onSave={handleFollowUpSave}
        readOnly={true}
      />
    </>
  );
}
