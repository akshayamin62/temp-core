'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, b2bAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, FOLLOWUP_STATUS, LEAD_STAGE, FollowUp } from '@/types';
import B2BOpsLayout from '@/components/B2BOpsLayout';
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

export default function B2BOpsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<any[]>([]);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [missedFollowUps, setMissedFollowUps] = useState<FollowUp[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

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

  const fetchData = async () => {
    try {
      const [leadsRes, followUpsRes] = await Promise.all([
        b2bAPI.getOpsLeads(),
        b2bAPI.getFollowUps(),
      ]);
      const allLeads = leadsRes.data.data.leads || [];
      setLeads(allLeads);

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

      // Try to get conversions for context
      try {
        const convRes = await b2bAPI.getAllConversions();
        setConversions(convRes.data.data.conversions || []);
      } catch {
        // OPS may not have access to all conversions, ignore
      }
    } catch {
      console.error('Failed to fetch dashboard data');
    }
  };

  const stats = {
    total: leads.length,
    inProcess: leads.filter((l: any) => l.stage === 'Proceed for Documentation').length,
    converted: leads.filter((l: any) => l.stage === 'Converted').length,
    pendingVerification: leads.filter((l: any) => l.stage === 'Proceed for Documentation' && (!l.conversionStatus || l.conversionStatus === 'DOCUMENT_VERIFICATION')).length,
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
      <B2BOpsLayout user={user}>
        <div className="p-8">
          <div className="mb-8 flex items-start justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{getFullName(user)}</h1>
            {/* <p className="text-gray-600 mt-1">B2B OPS Dashboard</p> */}
            {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="text-right"><p className="text-3xl font-extrabold text-gray-900">Day {d}</p><p className="text-sm text-gray-500">of {t.getFullYear()}</p></div>); })()}

          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assigned</p>
                  <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</h3>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Proceed for Documentation</p>
                  <h3 className="text-2xl font-extrabold text-purple-600 mt-1">{stats.inProcess}</h3>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                  <h3 className="text-2xl font-extrabold text-orange-600 mt-1">{stats.pendingVerification}</h3>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Converted</p>
                  <h3 className="text-2xl font-extrabold text-green-600 mt-1">{stats.converted}</h3>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-Up Calendar and Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
              <FollowUpCalendar followUps={adaptB2BFollowUps(allFollowUps)} onFollowUpSelect={(fu: any) => { const orig = allFollowUps.find((f: any) => f._id === fu._id); setSelectedFollowUp(orig || fu); setShowFollowUpPanel(true); }} />
            </div>
            <div className="lg:col-span-1">
              <FollowUpSidebar today={todayFollowUps} missed={missedFollowUps} upcoming={upcomingFollowUps} onFollowUpClick={(fu: any) => { const orig = allFollowUps.find((f: any) => f._id === fu._id); setSelectedFollowUp(orig || fu); setShowFollowUpPanel(true); }} basePath="/b2b-ops/leads" showLeadLink={true} />
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assigned Leads</h3>
              <button
                onClick={() => router.push('/b2b-ops/leads')}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
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
                    onClick={() => router.push(`/b2b-ops/leads/${lead._id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lead.firstName} {lead.middleName || ''} {lead.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{lead.email} • {lead.mobileNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          lead.stage === 'Proceed for Documentation' ? 'bg-purple-100 text-purple-800' :
                          lead.stage === 'Converted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
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
      </B2BOpsLayout>

      <B2BFollowUpFormPanel followUp={selectedFollowUp} isOpen={showFollowUpPanel} onClose={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); }} onSave={() => { setShowFollowUpPanel(false); setSelectedFollowUp(null); fetchData(); }} />
    </>
  );
}
