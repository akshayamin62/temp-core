'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
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
    adminId?: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
    };
    adminCompanyName?: string;
    email: string;
    mobileNumber?: string;
    referralSlug: string;
    createdAt: string;
  };
  leads: LeadData[];
  stageCounts: Record<string, number>;
  totalStudents: number;
}

const STAGE_CONFIG: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'total', label: 'Total Leads', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { key: 'New', label: 'New', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  { key: 'Hot', label: 'Hot', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  { key: 'Warm', label: 'Warm', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { key: 'Cold', label: 'Cold', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  { key: 'Converted to Student', label: 'Converted', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  { key: 'Closed', label: 'Closed', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-300' },
  { key: 'students', label: 'Students', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
];

export default function SuperAdminReferrerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const referrerId = params.referrerId as string;

  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<ReferrerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

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
      fetchDashboard();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await superAdminAPI.getReferrerDashboard(referrerId);
      setDashboard(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load referrer dashboard');
      router.push('/super-admin/referrers');
    } finally {
      setLoading(false);
    }
  };

  const getStatValue = (key: string): number => {
    if (!dashboard) return 0;
    if (key === 'total') return dashboard.leads.length;
    if (key === 'students') return dashboard.totalStudents;
    return dashboard.stageCounts[key] || 0;
  };

  const filteredLeads = dashboard?.leads.filter((lead) => {
    const matchesStage = !activeFilter || activeFilter === 'total' || lead.stage === activeFilter;
    const matchesSearch =
      !searchQuery ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.mobileNumber && lead.mobileNumber.includes(searchQuery));
    return matchesStage && matchesSearch;
  }) || [];

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
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const referrerUser = dashboard.referrer.userId;
  const referrerName = getFullName(referrerUser);
  const adminInfo = dashboard.referrer.adminId;
  const adminLabel = dashboard.referrer.adminCompanyName ||
    (adminInfo ? [adminInfo.firstName, adminInfo.middleName, adminInfo.lastName].filter(Boolean).join(' ') : 'N/A');

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/super-admin/referrers')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Referrers
          </button>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AuthImage
                  path={referrerUser.profilePicture}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                  fallback={
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xl">{getInitials(referrerUser)}</span>
                    </div>
                  }
                />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">{referrerName}</h2>
                    {!referrerUser.isVerified ? (
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    ) : referrerUser.isActive ? (
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{referrerUser.email}</p>
                  {dashboard.referrer.mobileNumber && (
                    <p className="text-gray-500 text-sm">{dashboard.referrer.mobileNumber}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-gray-400 text-xs">
                      Admin: <span className="text-gray-600 font-medium">{adminLabel}</span>
                    </p>
                    <p className="text-gray-400 text-xs">
                      Joined {new Date(referrerUser.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
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
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {STAGE_CONFIG.map((stage) => {
              const value = getStatValue(stage.key);
              const isActive = activeFilter === stage.key;
              return (
                <button
                  key={stage.key}
                  onClick={() => {
                    if (stage.key === 'students') return;
                    setActiveFilter(isActive ? null : stage.key);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    stage.key === 'students' ? 'cursor-default ' : 'cursor-pointer hover:shadow-md '
                  }${isActive ? 'ring-2 ring-blue-500 shadow-md ' : ''}${stage.bg}`}
                >
                  <p className={`text-2xl font-bold ${stage.color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stage.label}</p>
                </button>
              );
            })}
          </div>

          {/* Leads Table */}
          {(activeFilter && activeFilter !== 'students') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeFilter === 'total' ? 'All' : activeFilter} Leads ({filteredLeads.length})
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 pl-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No leads found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.mobileNumber || '-'}</td>
                        <td className="px-4 py-3">
                          <StageBadge stage={lead.stage} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/super-admin/leads/${lead._id}`)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    'New': 'bg-indigo-100 text-indigo-700',
    'Hot': 'bg-red-100 text-red-700',
    'Warm': 'bg-orange-100 text-orange-700',
    'Cold': 'bg-cyan-100 text-cyan-700',
    'Converted to Student': 'bg-green-100 text-green-700',
    'Closed': 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[stage] || 'bg-gray-100 text-gray-700'}`}>
      {stage}
    </span>
  );
}
