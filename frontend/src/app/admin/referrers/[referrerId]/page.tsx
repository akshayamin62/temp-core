'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, adminAPI } from '@/lib/api';
import { User, USER_ROLE, LEAD_STAGE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';

interface LeadData {
  _id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  city?: string;
  serviceTypes?: string[];
  stage: string;
  source?: string;
  createdAt: string;
}

interface ReferrerDashboard {
  referrer: {
    _id: string;
    userId: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
      profilePicture?: string;
      isActive: boolean;
      isVerified: boolean;
      createdAt: string;
    };
    email: string;
    mobileNumber?: string;
    referralSlug: string;
    createdAt: string;
  };
  leads: LeadData[];
  stageCounts: Record<string, number>;
  totalStudents: number;
}

export default function AdminReferrerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const referrerId = params.referrerId as string;

  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<ReferrerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStageCard, setSelectedStageCard] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied. Admin only.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchDashboard();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await adminAPI.getReferrerDashboard(referrerId);
      setDashboard(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load referrer dashboard');
      router.push('/admin/referrers');
    } finally {
      setLoading(false);
    }
  };

  const handleStageCardClick = (stage: string | null) => {
    if (stage === null || stage === 'all') {
      setSelectedStageCard('all');
      setStageFilter('');
    } else if (stage === 'students') {
      return;
    } else {
      setSelectedStageCard(stage);
      setStageFilter(stage);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case LEAD_STAGE.NEW: return 'bg-blue-100 text-blue-800';
      case LEAD_STAGE.HOT: return 'bg-red-100 text-red-800';
      case LEAD_STAGE.WARM: return 'bg-orange-100 text-orange-800';
      case LEAD_STAGE.COLD: return 'bg-cyan-100 text-cyan-800';
      case LEAD_STAGE.CONVERTED: return 'bg-green-100 text-green-800';
      case LEAD_STAGE.CLOSED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const copyReferralLink = () => {
    if (!dashboard) return;
    const link = `${window.location.origin}/referral/${dashboard.referrer.referralSlug}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const referrerUser = dashboard.referrer.userId;
  const allLeads = dashboard.leads;

  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(l => l.stage === LEAD_STAGE.NEW).length;
  const hotLeads = allLeads.filter(l => l.stage === LEAD_STAGE.HOT).length;
  const warmLeads = allLeads.filter(l => l.stage === LEAD_STAGE.WARM).length;
  const coldLeads = allLeads.filter(l => l.stage === LEAD_STAGE.COLD).length;
  const convertedLeads = allLeads.filter(l => l.stage === LEAD_STAGE.CONVERTED).length;
  const closedLeads = allLeads.filter(l => l.stage === LEAD_STAGE.CLOSED).length;
  const totalStudents = dashboard.totalStudents;

  const filteredLeads = allLeads.filter((lead) => {
    const matchesStage = !stageFilter || lead.stage === stageFilter;
    const matchesSearch =
      !searchQuery ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.mobileNumber && lead.mobileNumber.includes(searchQuery));
    return matchesStage && matchesSearch;
  });

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/referrers')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Referrers
          </button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Referrer Dashboard</h1>
            <p className="text-gray-600 mt-1">Leads referred by this referrer</p>
          </div>

          {/* Referrer Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <AuthImage
                path={referrerUser.profilePicture}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
                fallback={
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">{getInitials(referrerUser)}</span>
                  </div>
                }
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900">{getFullName(referrerUser)}</h2>
                  {!referrerUser.isVerified ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Pending</span>
                  ) : referrerUser.isActive ? (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Inactive</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{referrerUser.email}</p>
                {dashboard.referrer.mobileNumber && (
                  <p className="text-sm text-gray-500">{dashboard.referrer.mobileNumber}</p>
                )}
              </div>
            </div>
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Referral Link
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <StatCard title="Total Leads" value={totalLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="blue" onClick={() => handleStageCardClick('all')} isActive={selectedStageCard === 'all'} showPercentage={false} />
            <StatCard title="New" value={newLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} color="blue" onClick={() => handleStageCardClick(LEAD_STAGE.NEW)} isActive={selectedStageCard === LEAD_STAGE.NEW} percentage={totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0} />
            <StatCard title="Hot" value={hotLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>} color="red" onClick={() => handleStageCardClick(LEAD_STAGE.HOT)} isActive={selectedStageCard === LEAD_STAGE.HOT} percentage={totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0} />
            <StatCard title="Warm" value={warmLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>} color="orange" onClick={() => handleStageCardClick(LEAD_STAGE.WARM)} isActive={selectedStageCard === LEAD_STAGE.WARM} percentage={totalLeads > 0 ? (warmLeads / totalLeads) * 100 : 0} />
            <StatCard title="Cold" value={coldLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>} color="cyan" onClick={() => handleStageCardClick(LEAD_STAGE.COLD)} isActive={selectedStageCard === LEAD_STAGE.COLD} percentage={totalLeads > 0 ? (coldLeads / totalLeads) * 100 : 0} />
            <StatCard title="Converted" value={convertedLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="green" onClick={() => handleStageCardClick(LEAD_STAGE.CONVERTED)} isActive={selectedStageCard === LEAD_STAGE.CONVERTED} percentage={totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0} />
            <StatCard title="Closed" value={closedLeads} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} color="gray" onClick={() => handleStageCardClick(LEAD_STAGE.CLOSED)} isActive={selectedStageCard === LEAD_STAGE.CLOSED} percentage={totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0} />
            <StatCard title="Students" value={totalStudents} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>} color="purple" isActive={false} showPercentage={false} />
          </div>

          {/* Search and Filter */}
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
                    placeholder="Search by name, email or phone..."
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
                  onChange={(e) => {
                    setStageFilter(e.target.value);
                    setSelectedStageCard(e.target.value || 'all');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Stages</option>
                  {Object.values(LEAD_STAGE).map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStageFilter('');
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
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No leads found</h3>
                <p className="text-gray-500">No referral leads match current filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-1/4 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead</th>
                      <th className="w-1/4 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stage</th>
                      <th className="w-1/6 px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="w-1/6 px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="truncate">
                            <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                            <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                            <p className="text-sm text-gray-500">{lead.mobileNumber || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {lead.serviceTypes?.map((service) => (
                              <span key={service} className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {service}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                            {lead.stage}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => router.push(`/admin/leads/${lead._id}`)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
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
      } ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
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
