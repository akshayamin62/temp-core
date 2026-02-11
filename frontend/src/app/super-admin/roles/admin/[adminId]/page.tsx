'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import TeamMeetCalendar from '@/components/TeamMeetCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import { getFullName, getInitials } from '@/utils/nameHelpers';

interface DashboardStats {
  totalCounselors: number;
  totalLeads: number;
  newLeads: number;
  totalStudents: number;
  enquiryFormUrl: string;
  enquiryFormSlug: string;
  admin: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
    companyName?: string;
    companyLogo?: string;
    address?: string;
    mobileNumber?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SuperAdminAdminDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('view');
  const [showTeamMeetSection, setShowTeamMeetSection] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === USER_ROLE.SUPER_ADMIN) {
      fetchDashboardData();
      fetchTeamMeets();
    }
  }, [currentUser, adminId]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Super Admin privileges required.');
        router.push('/');
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      toast.error('Authentication failed');
      router.push('/login');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getAdminDashboardStats(adminId);
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Fetch dashboard error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch admin dashboard');
      router.push('/super-admin/roles/admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await superAdminAPI.getAdminTeamMeets(adminId);
      setTeamMeets(response.data.data.teamMeets);
    } catch (error) {
      console.error('Failed to fetch team meets:', error);
    }
  }, [adminId]);

  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setTeamMeetPanelMode('view');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard!');
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-8">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/super-admin/roles/admin')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              {stats?.admin?.companyLogo ? (
                <img
                  src={`${API_URL}${stats.admin.companyLogo}`}
                  alt={stats.admin.companyName || 'Company Logo'}
                  className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">
                    {stats?.admin?.companyName?.charAt(0) || getInitials(stats?.admin) || 'A'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {stats?.admin?.companyName || getFullName(stats?.admin) || 'Admin Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">
                  {getFullName(stats?.admin)} &middot; {stats?.admin?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Profile Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500">Status: </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  stats?.admin?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {stats?.admin?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Verified: </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  stats?.admin?.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {stats?.admin?.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              {stats?.admin?.mobileNumber && (
                <div>
                  <span className="text-gray-500">Phone: </span>
                  <span className="text-gray-900">{stats.admin.mobileNumber}</span>
                </div>
              )}
              {stats?.admin?.address && (
                <div>
                  <span className="text-gray-500">Address: </span>
                  <span className="text-gray-900">{stats.admin.address}</span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Counselors"
                  value={stats?.totalCounselors?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                  color="blue"
                />
                <StatCard
                  title="Total Leads"
                  value={stats?.totalLeads?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  color="purple"
                />
                <StatCard
                  title="New Leads"
                  value={stats?.newLeads?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                  color="yellow"
                />
                <StatCard
                  title="Total Students"
                  value={stats?.totalStudents?.toString() || '0'}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  }
                  color="green"
                />
              </div>

              {/* Enquiry Form URL */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900 text-sm">Enquiry Form URL</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2">
                    <code className="text-xs text-blue-700 font-mono break-all">
                      {stats?.enquiryFormUrl || 'Loading...'}
                    </code>
                  </div>
                  <button
                    onClick={() => stats?.enquiryFormUrl && copyToClipboard(stats.enquiryFormUrl)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ActionCard
                    title="View Counselors"
                    description="View all counselors under this admin"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    }
                    buttonText="View Counselors"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/counselors`)}
                    color="blue"
                  />
                  <ActionCard
                    title="View Leads"
                    description="Check all leads from this admin's enquiry form"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    }
                    buttonText="View Leads"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/leads`)}
                    color="blue"
                  />
                  <ActionCard
                    title="View Students"
                    description="Check all students under this admin"
                    icon={
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                    }
                    buttonText="View Students"
                    onClick={() => router.push(`/super-admin/roles/admin/${adminId}/students`)}
                    color="blue"
                  />
                </div>
              </div>

              {/* TeamMeet Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">TeamMeet</h2>
                      <p className="text-sm text-gray-500">View this admin&apos;s meetings with counselors (read-only)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {teamMeets.filter(tm => tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION).length > 0 && (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                        {teamMeets.filter(tm => tm.status === TEAMMEET_STATUS.PENDING_CONFIRMATION).length} pending
                      </span>
                    )}
                    <button
                      onClick={() => setShowTeamMeetSection(!showTeamMeetSection)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className={`w-5 h-5 transition-transform ${showTeamMeetSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {showTeamMeetSection && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Calendar Section */}
                    <div className="lg:col-span-3">
                      <TeamMeetCalendar
                        teamMeets={teamMeets}
                        onTeamMeetSelect={handleTeamMeetSelect}
                        currentUserId={adminId}
                      />
                    </div>

                    {/* Sidebar Section - No schedule button for read only */}
                    <div className="lg:col-span-1">
                      <TeamMeetSidebar
                        teamMeets={teamMeets}
                        onTeamMeetClick={handleTeamMeetSelect}
                        currentUserId={adminId}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SuperAdminLayout>

      {/* TeamMeet Slide-in Panel (read-only) */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={() => {}} 
        mode={teamMeetPanelMode}
        currentUserId={adminId}
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
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function ActionCard({ title, description, icon, buttonText, onClick, color }: ActionCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    yellow: 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white',
  };

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 group hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <button
        onClick={onClick}
        className={`w-full px-4 py-2 text-white rounded-lg font-medium transition-colors ${buttonColorClasses[color]}`}
      >
        {buttonText}
      </button>
    </div>
  );
}
