'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, b2bAPI } from '@/lib/api';
import { User, USER_ROLE, B2B_LEAD_STAGE, B2B_LEAD_TYPE } from '@/types';
import B2BSalesLayout from '@/components/B2BSalesLayout';
import toast, { Toaster } from 'react-hot-toast';

interface B2BLeadData {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  type: string;
  stage: string;
  conversionStatus?: string;
  createdAt: string;
}

export default function B2BSalesLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allLeads, setAllLeads] = useState<B2BLeadData[]>([]);
  const [leads, setLeads] = useState<B2BLeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedStageCard, setSelectedStageCard] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  // Convert to In Process modal
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user, typeFilter]);

  useEffect(() => {
    let filtered = allLeads;
    if (stageFilter) {
      filtered = filtered.filter(l => l.stage === stageFilter);
    }
    setLeads(filtered);
  }, [allLeads, stageFilter]);

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
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      const response = await b2bAPI.getSalesLeads(params);
      setAllLeads(response.data.data.leads || []);
    } catch {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStageCardClick = (stage: string | null) => {
    if (stage === null || stage === 'all') {
      setSelectedStageCard('all');
      setStageFilter('');
    } else {
      setSelectedStageCard(stage);
      setStageFilter(stage);
    }
  };

  const handleConvertToInProcess = async () => {
    if (!convertingLeadId) return;
    try {
      setConverting(true);
      await b2bAPI.requestInProcessConversion(convertingLeadId);
      toast.success('Conversion request submitted. Awaiting Super Admin approval.');
      setShowConvertModal(false);
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request conversion');
    } finally {
      setConverting(false);
    }
  };

  const getFullName = (lead: B2BLeadData) => {
    return [lead.firstName, lead.middleName, lead.lastName].filter(Boolean).join(' ');
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return getFullName(lead).toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.mobileNumber.includes(q);
  });

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

  // Stats calculations (always from allLeads so they don't change on filter)
  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.NEW).length;
  const hotLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.HOT).length;
  const warmLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.WARM).length;
  const coldLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.COLD).length;
  const inProcessLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.IN_PROCESS).length;
  const convertedLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.CONVERTED).length;
  const closedLeads = allLeads.filter(l => l.stage === B2B_LEAD_STAGE.CLOSED).length;

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My B2B Leads</h1>
            <p className="text-gray-600 mt-1">Manage your assigned B2B leads</p>
          </div>

          {/* Stats Cards - Clickable */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
            <StatCard
              title="Total Leads"
              value={totalLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              color="blue"
              onClick={() => handleStageCardClick('all')}
              isActive={selectedStageCard === 'all'}
              showPercentage={false}
            />
            <StatCard
              title="New"
              value={newLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
              color="blue"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.NEW)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.NEW}
              percentage={totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Hot"
              value={hotLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              }
              color="red"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.HOT)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.HOT}
              percentage={totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Warm"
              value={warmLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              }
              color="orange"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.WARM)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.WARM}
              percentage={totalLeads > 0 ? (warmLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Cold"
              value={coldLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
              color="cyan"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.COLD)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.COLD}
              percentage={totalLeads > 0 ? (coldLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Documentation"
              value={inProcessLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              color="purple"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.IN_PROCESS)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.IN_PROCESS}
              percentage={totalLeads > 0 ? (inProcessLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Converted"
              value={convertedLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.CONVERTED)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.CONVERTED}
              percentage={totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0}
            />
            <StatCard
              title="Closed"
              value={closedLeads}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              color="gray"
              onClick={() => handleStageCardClick(B2B_LEAD_STAGE.CLOSED)}
              isActive={selectedStageCard === B2B_LEAD_STAGE.CLOSED}
              percentage={totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0}
            />
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
                <select
                  value={stageFilter}
                  onChange={(e) => { setStageFilter(e.target.value); setSelectedStageCard(e.target.value || null); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Stages</option>
                  {Object.values(B2B_LEAD_STAGE).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {Object.values(B2B_LEAD_TYPE).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStageFilter('');
                    setTypeFilter('');
                    setSearchQuery('');
                    setSelectedStageCard(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
                <p className="text-gray-500">
                  {stageFilter || typeFilter ? 'Try adjusting your filters' : 'No B2B leads assigned yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-1/5 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="w-1/4 px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">{getFullName(lead)}</p>
                            <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                            <p className="text-sm text-gray-500">{lead.mobileNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(lead.type)}`}>
                            {lead.type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                            {lead.stage}
                          </span>
                          {lead.conversionStatus === 'Pending' && (
                            <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Conversion Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => router.push(`/b2b-sales/leads/${lead._id}`)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                              View Details
                            </button>
                            {[B2B_LEAD_STAGE.NEW, B2B_LEAD_STAGE.HOT, B2B_LEAD_STAGE.WARM].includes(lead.stage as B2B_LEAD_STAGE) && !lead.conversionStatus && (
                              <button
                                onClick={() => {
                                  setConvertingLeadId(lead._id);
                                  setShowConvertModal(true);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                              >
                                Proceed for Documentation
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Convert to In Process Modal */}
        {showConvertModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowConvertModal(false)}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Proceed for Documentation</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will send a conversion request to the Super Admin. Once approved, the lead will move to &quot;Proceed for Documentation&quot; stage and can be assigned to B2B OPS for verification.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConvertModal(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleConvertToInProcess}
                  disabled={converting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {converting ? 'Requesting...' : 'Request Conversion'}
                </button>
              </div>
            </div>
          </div>
        )}
      </B2BSalesLayout>
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray' | 'purple';
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
