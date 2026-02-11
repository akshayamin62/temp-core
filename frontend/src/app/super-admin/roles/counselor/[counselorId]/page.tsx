'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE, FollowUp, FollowUpSummary, FOLLOWUP_STATUS, TeamMeet, TEAMMEET_STATUS, SERVICE_TYPE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import FollowUpFormPanel from '@/components/FollowUpFormPanel';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import ScheduleOverview from '@/components/ScheduleOverview';
import { getFullName } from '@/utils/nameHelpers';

interface CounselorDetail {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
  };
  email: string;
  mobileNumber?: string;
  createdAt: string;
}

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  convertedLeads: number;
  closedLeads: number;
  adminEnquiryUrl: string;
}

export default function SuperAdminCounselorDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const counselorId = params.counselorId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [counselor, setCounselor] = useState<CounselorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // Follow-up state
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpSummary, setFollowUpSummary] = useState<FollowUpSummary | null>(null);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);

  // TeamMeet state (read-only for super admin)
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const fetchFollowUps = useCallback(async () => {
    try {
      const [followUpsResponse, summaryResponse] = await Promise.all([
        superAdminAPI.getCounselorFollowUps(counselorId),
        superAdminAPI.getCounselorFollowUpSummary(counselorId),
      ]);
      setFollowUps(followUpsResponse.data.data.followUps);
      setFollowUpSummary(summaryResponse.data.data);
    } catch (error: any) {
      console.error('Error fetching follow-ups:', error);
    }
  }, [counselorId]);

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await superAdminAPI.getCounselorTeamMeets(counselorId);
      setTeamMeets(response.data.data.teamMeets || []);
    } catch (error: any) {
      console.error('Error fetching counselor TeamMeets:', error);
    }
  }, [counselorId]);

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
      fetchCounselorDetail();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselorDetail = async () => {
    try {
      const response = await superAdminAPI.getCounselorDashboard(counselorId);
      const data = response.data.data;
      
      setCounselor(data.counselor);
      setLeads(data.leads);
      
      const leadsData = data.leads;
      const slug = data.enquirySlug;
      
      // Construct full URL from slug
      const enquiryUrl = slug ? `${window.location.origin}/enquiry/${slug}` : '';

      setStats({
        totalLeads: leadsData.length,
        newLeads: leadsData.filter((l: any) => l.stage === LEAD_STAGE.NEW).length,
        hotLeads: leadsData.filter((l: any) => l.stage === LEAD_STAGE.HOT).length,
        warmLeads: leadsData.filter((l: any) => l.stage === LEAD_STAGE.WARM).length,
        coldLeads: leadsData.filter((l: any) => l.stage === LEAD_STAGE.COLD).length,
        convertedLeads: leadsData.filter((l: any) => l.stage === LEAD_STAGE.CONVERTED).length,
        closedLeads: leadsData.filter((l: any) => l.stage === LEAD_STAGE.CLOSED).length,
        adminEnquiryUrl: enquiryUrl,
      });
      
      // Fetch follow-ups and TeamMeets after getting counselor detail
      fetchFollowUps();
      fetchTeamMeets();
    } catch (error: any) {
      console.error('Error fetching counselor detail:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch counselor details');
      router.push('/super-admin/roles/counselor');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy URL');
    }
  };

  const getFilteredLeads = () => {
    if (!selectedStage) return [];
    
    let filtered = leads;
    
    // Apply stage filter
    if (selectedStage === 'all') {
      if (stageFilter !== 'all') {
        filtered = filtered.filter((lead: any) => lead.stage === stageFilter);
      }
    } else {
      filtered = filtered.filter((lead: any) => lead.stage === selectedStage);
    }
    
    // Apply service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter((lead: any) => lead.serviceTypes?.includes(serviceFilter));
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lead: any) => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.mobileNumber?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Handle calendar event click
  const handleFollowUpSelect = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setShowFollowUpPanel(true);
  };

  // Handle sidebar item click
  const handleSidebarFollowUpClick = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setShowFollowUpPanel(true);
  };

  // Handle lead detail panel open
  const handleLeadDetailOpen = (leadId: string) => {
    setSelectedLeadId(leadId);
    setCalendarCollapsed(true);
  };

  // Handle lead detail panel close
  const handleLeadDetailClose = () => {
    setSelectedLeadId(null);
    setCalendarCollapsed(false);
  };

  // Handle follow-up panel save
  const handleFollowUpSave = async () => {
    setShowFollowUpPanel(false);
    setSelectedFollowUp(null);
    await fetchFollowUps();
    await fetchCounselorDetail();
  };

  // Handle follow-up panel close
  const handleFollowUpPanelClose = () => {
    setShowFollowUpPanel(false);
    setSelectedFollowUp(null);
  };

  // TeamMeet handlers (read-only for super admin)
  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
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

  // Handle stat card click
  const handleStatCardClick = (stage: string | null) => {
    if (stage) {
      setSelectedStage(stage);
      setCalendarCollapsed(true);
      if (stage === 'all') {
        setStageFilter('all');
        setServiceFilter('all');
        setSearchQuery('');
      }
    }
  };

  // Handle closing leads table
  const handleCloseLeadsTable = () => {
    setSelectedStage(null);
    setCalendarCollapsed(false);
    setStageFilter('all');
    setServiceFilter('all');
    setSearchQuery('');
  };

  // Handle expanding collapsed calendar
  const handleExpandCalendar = () => {
    setSelectedStage(null);
    setCalendarCollapsed(false);
    setSelectedLeadId(null);
  };

  // Handle new follow-up scheduled from lead detail
  const handleFollowUpScheduled = async () => {
    await fetchFollowUps();
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

  if (!user || !counselor) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            {/* Back button */}
            <button
              onClick={() => router.push('/super-admin/roles/counselor')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Counselors
            </button>
            
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{getFullName(counselor.userId)}</h1>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    counselor.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {counselor.userId.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">
                  {counselor.userId.email} • {counselor.mobileNumber || 'No phone'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Joined: {new Date(counselor.createdAt).toLocaleDateString()}
                </p>
              </div>
              {/* Copy Enquiry URL */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 text-sm">Enquiry Form</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-green-50 rounded-lg px-3 py-2">
                    <code className="text-xs text-green-700 font-mono break-all">
                      {stats?.adminEnquiryUrl || 'Loading...'}
                    </code>
                  </div>
                  <button
                    onClick={() => stats?.adminEnquiryUrl && copyToClipboard(stats.adminEnquiryUrl)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
            <StatCard
              title="Total Leads"
              value={stats?.totalLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color="blue"
              onClick={() => handleStatCardClick('all')}
              isActive={selectedStage === 'all'}
              showPercentage={false}
            />
            <StatCard
              title="New"
              value={stats?.newLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              color="blue"
              onClick={() => handleStatCardClick(LEAD_STAGE.NEW)}
              isActive={selectedStage === LEAD_STAGE.NEW}
              percentage={stats && stats.totalLeads > 0 ? (stats.newLeads / stats.totalLeads) * 100 : 0}
            />
            <StatCard
              title="Hot"
              value={stats?.hotLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              }
              color="red"
              onClick={() => handleStatCardClick(LEAD_STAGE.HOT)}
              isActive={selectedStage === LEAD_STAGE.HOT}
              percentage={stats && stats.totalLeads > 0 ? (stats.hotLeads / stats.totalLeads) * 100 : 0}
            />
            <StatCard
              title="Warm"
              value={stats?.warmLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              }
              color="orange"
              onClick={() => handleStatCardClick(LEAD_STAGE.WARM)}
              isActive={selectedStage === LEAD_STAGE.WARM}
              percentage={stats && stats.totalLeads > 0 ? (stats.warmLeads / stats.totalLeads) * 100 : 0}
            />
            <StatCard
              title="Cold"
              value={stats?.coldLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
              color="cyan"
              onClick={() => handleStatCardClick(LEAD_STAGE.COLD)}
              isActive={selectedStage === LEAD_STAGE.COLD}
              percentage={stats && stats.totalLeads > 0 ? (stats.coldLeads / stats.totalLeads) * 100 : 0}
            />
            <StatCard
              title="Converted"
              value={stats?.convertedLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
              onClick={() => handleStatCardClick(LEAD_STAGE.CONVERTED)}
              isActive={selectedStage === LEAD_STAGE.CONVERTED}
              percentage={stats && stats.totalLeads > 0 ? (stats.convertedLeads / stats.totalLeads) * 100 : 0}
            />
            <StatCard
              title="Closed"
              value={stats?.closedLeads.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              color="gray"
              onClick={() => handleStatCardClick(LEAD_STAGE.CLOSED)}
              isActive={selectedStage === LEAD_STAGE.CLOSED}
              percentage={stats && stats.totalLeads > 0 ? (stats.closedLeads / stats.totalLeads) * 100 : 0}
            />
          </div>

          {/* Collapsed Calendar Icon - Show when leads table is open */}
          {calendarCollapsed && !selectedLeadId && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleExpandCalendar}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">Follow-Up Calendar</p>
                  <p className="text-xs text-gray-500">
                    {followUps.length} scheduled • {followUpSummary?.counts?.missed || 0} missed
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Calendar and Sidebar Section */}
          {!calendarCollapsed && (
            <div className="mb-8">
              {selectedLeadId ? (
                // Lead Detail Panel View
                <LeadDetailPanel
                  leadId={selectedLeadId}
                  onClose={handleLeadDetailClose}
                  onFollowUpScheduled={handleFollowUpScheduled}
                />
              ) : (
                // Schedule Calendar + Sidebar (Read-only)
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Calendar Section */}
                  <div className="lg:col-span-3">
                    <ScheduleCalendar
                      followUps={followUps}
                      teamMeets={teamMeets}
                      onFollowUpSelect={handleFollowUpSelect}
                      onTeamMeetSelect={handleTeamMeetSelect}
                      currentUserId={counselor?.userId?._id}
                      readOnly={true}
                    />
                  </div>

                  {/* Sidebar Section */}
                  <div className="lg:col-span-1">
                    <ScheduleOverview
                      followUps={followUps}
                      teamMeets={teamMeets}
                      onFollowUpClick={handleSidebarFollowUpClick}
                      onTeamMeetClick={handleTeamMeetSelect}
                      currentUserId={counselor?.userId?._id}
                      showLeadLink={true}
                      basePath="/super-admin/leads"
                      readOnly={true}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leads Table */}
          {selectedStage && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedStage === 'all' ? 'All Leads' : `${selectedStage} Leads`}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {getFilteredLeads().length} lead(s) found
                    </p>
                  </div>
                  <button
                    onClick={handleCloseLeadsTable}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                      type="text"
                      placeholder="Search by name, email, or mobile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Stage Filter - Only show for 'all' leads view */}
                  {selectedStage === 'all' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Stages</option>
                        <option value={LEAD_STAGE.NEW}>New</option>
                        <option value={LEAD_STAGE.HOT}>Hot</option>
                        <option value={LEAD_STAGE.WARM}>Warm</option>
                        <option value={LEAD_STAGE.COLD}>Cold</option>
                        <option value={LEAD_STAGE.CONVERTED}>Converted</option>
                        <option value={LEAD_STAGE.CLOSED}>Closed</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Service Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Services</option>
                      <option value="Education Planning">Education Planning</option>
                      <option value="Carrer Focus Study Abroad ">Carrer Focus Study Abroad</option>
                      <option value="Ivy League Admission">Ivy League Admission</option>
                      <option value="IELTS/GRE/Language Coaching">IELTS/GRE/Language Coaching</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredLeads().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-lg font-medium">No leads found</p>
                        </td>
                      </tr>
                    ) : (
                      getFilteredLeads().map((lead: any) => (
                        <tr key={lead._id} className="hover:bg-gray-50">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <Link 
                              href={`/super-admin/leads/${lead._id}`}
                              className="text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline"
                            >
                              {lead.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lead.mobileNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lead.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              lead.stage === LEAD_STAGE.NEW ? 'bg-blue-100 text-blue-800' :
                              lead.stage === LEAD_STAGE.HOT ? 'bg-red-100 text-red-800' :
                              lead.stage === LEAD_STAGE.WARM ? 'bg-orange-100 text-orange-800' :
                              lead.stage === LEAD_STAGE.COLD ? 'bg-cyan-100 text-cyan-800' :
                              lead.stage === LEAD_STAGE.CONVERTED ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {lead.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {lead.serviceTypes?.map((service: string, idx: number) => (
                                <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                                  {service}
                                </span>
                              )) || <span className="text-sm text-gray-500">N/A</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => router.push(`/super-admin/leads/${lead._id}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SuperAdminLayout>

      {/* Follow-up Slide-in Panel */}
      <FollowUpFormPanel
        followUp={selectedFollowUp}
        isOpen={showFollowUpPanel}
        onClose={handleFollowUpPanelClose}
        onSave={handleFollowUpSave}
        readOnly={true}
      />

      {/* TeamMeet Slide-in Panel (Read-only for super admin) */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={handleTeamMeetPanelClose}
        mode="view"
        currentUserId={user?.id || user?._id}
        readOnly={true}
      />
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number;
  showPercentage?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive, percentage, showPercentage = true }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    gray: 'bg-gray-200 text-gray-600',
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border-2 p-5 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${
        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {showPercentage && percentage !== undefined && (
          <p className="text-sm font-semibold text-gray-900">{percentage.toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
}
