'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, b2bAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, FOLLOWUP_STATUS, LEAD_STAGE, FollowUp } from '@/types';
import B2BSalesLayout from '@/components/B2BSalesLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import FollowUpCalendar from '@/components/FollowUpCalendar';
import FollowUpSidebar from '@/components/FollowUpSidebar';
import B2BFollowUpFormPanel from '@/components/B2BFollowUpFormPanel';

// Adapter: map B2B follow-up data to FollowUp shape for calendar/sidebar
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

interface LeadStats {
  total: number;
  new: number;
  hot: number;
  warm: number;
  cold: number;
  inProcess: number;
  converted: number;
  closed: number;
}

interface FollowUpSummaryData {
  today: any[];
  missed: any[];
  upcoming: any[];
}

export default function B2BSalesDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [followUpSummary, setFollowUpSummary] = useState<FollowUpSummaryData | null>(null);
  const [allFollowUps, setAllFollowUps] = useState<any[]>([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [missedFollowUps, setMissedFollowUps] = useState<FollowUp[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  // Stat card click filtering state
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

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

  const fetchData = async () => {
    try {
      const [leadsRes, summaryRes, followUpsRes] = await Promise.all([
        b2bAPI.getSalesLeads(),
        b2bAPI.getFollowUpSummary(),
        b2bAPI.getFollowUps(),
      ]);
      setLeads(leadsRes.data.data.leads || []);
      setStats(leadsRes.data.data.stats || null);
      setFollowUpSummary(summaryRes.data.data || null);

      const fus = followUpsRes.data.data.followUps || [];
      setAllFollowUps(fus);
      const adapted = adaptB2BFollowUps(fus);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tList: FollowUp[] = []; const mList: FollowUp[] = []; const uList: FollowUp[] = [];
      adapted.forEach((fu) => {
        const fuDate = new Date(fu.scheduledDate); fuDate.setHours(0, 0, 0, 0);
        if (fu.status === FOLLOWUP_STATUS.SCHEDULED) {
          if (fuDate.getTime() === today.getTime()) tList.push(fu);
          else if (fuDate < today) mList.push(fu);
          else uList.push(fu);
        }
      });
      setTodayFollowUps(tList); setMissedFollowUps(mList); setUpcomingFollowUps(uList);
    } catch {
      console.error('Failed to fetch dashboard data');
    }
  };

  const getFilteredLeads = () => {
    if (!selectedStage) return [];
    
    let filtered = leads;
    
    if (selectedStage === 'all') {
      if (stageFilter !== 'all') {
        filtered = filtered.filter((lead: any) => lead.stage === stageFilter);
      }
    } else {
      filtered = filtered.filter((lead: any) => lead.stage === selectedStage);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((lead: any) => 
        lead.firstName?.toLowerCase().includes(query) ||
        lead.lastName?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.mobileNumber?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const handleStatCardClick = (stage: string | null) => {
    if (stage) {
      setSelectedStage(stage);
      setCalendarCollapsed(true);
      if (stage === 'all') {
        setStageFilter('all');
        setSearchQuery('');
      }
    }
  };

  const handleCloseLeadsTable = () => {
    setSelectedStage(null);
    setCalendarCollapsed(false);
    setStageFilter('all');
    setSearchQuery('');
  };

  const handleExpandCalendar = () => {
    setSelectedStage(null);
    setCalendarCollapsed(false);
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

  if (loading) {
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
      <B2BSalesLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getFullName(user)}</h1>
            </div>
            <div className="flex flex-col items-end gap-4">
              {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="text-right"><p className="text-3xl font-extrabold text-gray-900">Day {d}</p><p className="text-sm text-gray-500">of {t.getFullYear()}</p></div>); })()}
              {/* Copy Enquiry URL */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 max-w-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 text-sm">B2B Enquiry Form</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2">
                    <code className="text-xs text-blue-700 font-mono break-all">
                      {`${typeof window !== 'undefined' ? window.location.origin : ''}/b2b-enquiry`}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/b2b-enquiry`;
                      navigator.clipboard.writeText(url);
                      toast.success('Enquiry form URL copied!');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
            <StatCard
              title="Total Leads"
              value={stats?.total?.toString() || '0'}
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
              value={stats?.new?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              color="blue"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.NEW)}
              isActive={selectedStage === B2B_LEAD_STAGE.NEW}
              percentage={stats && stats.total > 0 ? (stats.new / stats.total) * 100 : 0}
            />
            <StatCard
              title="Hot"
              value={stats?.hot?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              }
              color="red"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.HOT)}
              isActive={selectedStage === B2B_LEAD_STAGE.HOT}
              percentage={stats && stats.total > 0 ? (stats.hot / stats.total) * 100 : 0}
            />
            <StatCard
              title="Warm"
              value={stats?.warm?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              }
              color="orange"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.WARM)}
              isActive={selectedStage === B2B_LEAD_STAGE.WARM}
              percentage={stats && stats.total > 0 ? (stats.warm / stats.total) * 100 : 0}
            />
            <StatCard
              title="Cold"
              value={stats?.cold?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
              color="cyan"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.COLD)}
              isActive={selectedStage === B2B_LEAD_STAGE.COLD}
              percentage={stats && stats.total > 0 ? (stats.cold / stats.total) * 100 : 0}
            />
            <StatCard
              title="In Process"
              value={stats?.inProcess?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              color="purple"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.IN_PROCESS)}
              isActive={selectedStage === B2B_LEAD_STAGE.IN_PROCESS}
              percentage={stats && stats.total > 0 ? (stats.inProcess / stats.total) * 100 : 0}
            />
            <StatCard
              title="Converted"
              value={stats?.converted?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.CONVERTED)}
              isActive={selectedStage === B2B_LEAD_STAGE.CONVERTED}
              percentage={stats && stats.total > 0 ? (stats.converted / stats.total) * 100 : 0}
            />
            <StatCard
              title="Closed"
              value={stats?.closed?.toString() || '0'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              color="gray"
              onClick={() => handleStatCardClick(B2B_LEAD_STAGE.CLOSED)}
              isActive={selectedStage === B2B_LEAD_STAGE.CLOSED}
              percentage={stats && stats.total > 0 ? (stats.closed / stats.total) * 100 : 0}
            />
          </div>

          {/* Follow-up Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today&apos;s Follow-ups</p>
                  <h3 className="text-2xl font-extrabold text-blue-600 mt-1">{followUpSummary?.today?.length || 0}</h3>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Missed Follow-ups</p>
                  <h3 className="text-2xl font-extrabold text-red-600 mt-1">{followUpSummary?.missed?.length || 0}</h3>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Follow-ups</p>
                  <h3 className="text-2xl font-extrabold text-green-600 mt-1">{followUpSummary?.upcoming?.length || 0}</h3>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsed Calendar Icon - Show when leads table is open */}
          {calendarCollapsed && (
            <div className="flex justify-end gap-3 mb-4">
              <button
                onClick={handleExpandCalendar}
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-teal-300 transition-all"
              >
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">Schedule Calendar</p>
                  <p className="text-xs text-gray-500">
                    {allFollowUps.length} follow-ups
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Follow-Up Calendar and Overview */}
          {!calendarCollapsed && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
              <FollowUpCalendar followUps={adaptB2BFollowUps(allFollowUps)} onFollowUpSelect={(fu: any) => { const orig = allFollowUps.find((f: any) => f._id === fu._id); setSelectedFollowUp(orig || fu); setShowFollowUpPanel(true); }} />
            </div>
            <div className="lg:col-span-1">
              <FollowUpSidebar today={todayFollowUps} missed={missedFollowUps} upcoming={upcomingFollowUps} onFollowUpClick={(fu: any) => { const orig = allFollowUps.find((f: any) => f._id === fu._id); setSelectedFollowUp(orig || fu); setShowFollowUpPanel(true); }} basePath="/b2b-sales/leads" showLeadLink={true} />
            </div>
          </div>
          )}

          {/* Filtered Leads Table */}
          {selectedStage && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  
                  {selectedStage === 'all' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Stages</option>
                        {Object.values(B2B_LEAD_STAGE).map((stage) => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button 
                              onClick={() => router.push(`/b2b-sales/leads/${lead._id}`)}
                              className="text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline"
                            >
                              {lead.firstName} {lead.middleName || ''} {lead.lastName}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lead.mobileNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lead.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                              {lead.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {lead.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => router.push(`/b2b-sales/leads/${lead._id}`)}
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

          {/* Recent Leads */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent B2B Leads</h3>
              <button
                onClick={() => router.push('/b2b-sales/leads')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All →
              </button>
            </div>
            {leads.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">No leads assigned yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {leads.slice(0, 5).map((lead: any) => (
                  <div
                    key={lead._id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/b2b-sales/leads/${lead._id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lead.firstName} {lead.middleName || ''} {lead.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{lead.email} • {lead.mobileNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStageColor(lead.stage)}`}>
                          {lead.stage}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          {lead.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </B2BSalesLayout>

      <B2BFollowUpFormPanel followUp={selectedFollowUp} isOpen={showFollowUpPanel} onClose={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); }} onSave={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); fetchData(); }} />
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray' | 'purple';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number;
  showPercentage?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive, percentage, showPercentage = true }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    gray: 'bg-gray-200 text-gray-600',
    purple: 'bg-purple-100 text-purple-600',
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
