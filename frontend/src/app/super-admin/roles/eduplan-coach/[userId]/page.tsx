'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminEduplanCoachAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import TeamMeetCalendar from '@/components/TeamMeetCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';

interface StudentData {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  adminId?: {
    _id: string;
    companyName?: string;
    userId: {
      _id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
    };
  };
  registrationCount: number;
  serviceNames?: string[];
  createdAt: string;
}

export default function SuperAdminEduplanCoachDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const coachUserId = params.userId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coachUser, setCoachUser] = useState<any>(null);
  const [coachRecord, setCoachRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);


  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('view');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === USER_ROLE.SUPER_ADMIN) {
      fetchCoachDetail();
      fetchCoachStudents();
      fetchTeamMeets();
    }
  }, [currentUser, coachUserId]);

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

  const fetchCoachDetail = async () => {
    try {
      setLoading(true);
      const response = await superAdminEduplanCoachAPI.getCoachDetail(coachUserId);
      setCoachUser(response.data.data.user);
      setCoachRecord(response.data.data.coach);
    } catch (error: any) {
      console.error('Fetch coach detail error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch coach details');
      router.push('/super-admin/roles/eduplan-coach');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachStudents = async () => {
    try {
      const response = await superAdminEduplanCoachAPI.getCoachStudents(coachUserId);
      setStudents(response.data.data.students || []);
    } catch (error) {
      console.error('Failed to fetch coach students:', error);
    }
  };

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await superAdminEduplanCoachAPI.getCoachTeamMeets(coachUserId);
      setTeamMeets(response.data.data.teamMeets || []);
    } catch (error) {
      console.error('Failed to fetch team meets:', error);
    }
  }, [coachUserId]);

  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setTeamMeetPanelMode('view');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
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
              onClick={() => router.push('/super-admin/roles/eduplan-coach')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <AuthImage
                path={coachUser?.profilePicture}
                alt={getFullName(coachUser) || 'Eduplan Coach'}
                className="w-10 h-10 rounded-lg object-cover"
                fallback={
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {getInitials(coachUser) || 'E'}
                    </span>
                  </div>
                }
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {getFullName(coachUser) || 'Eduplan Coach Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">
                  {coachUser?.email} {coachRecord?.mobileNumber ? `· ${coachRecord.mobileNumber}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Coach Profile Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500">Status: </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  coachUser?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {coachUser?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Verified: </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  coachUser?.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {coachUser?.isVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Assigned Students: </span>
                <span className="text-gray-900 font-medium">{students.length}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Assigned Students</p>
                      <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Team Meets</p>
                      <p className="text-3xl font-bold text-gray-900">{teamMeets.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div
                    onClick={() => router.push(`/super-admin/roles/eduplan-coach/${coachUserId}/students`)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 group hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 transition-colors bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">View Students</h3>
                    <p className="text-sm text-gray-600 mb-4">View all students assigned to this coach</p>
                    <span className="inline-block w-full px-4 py-2 text-center text-white rounded-lg font-medium bg-blue-600 hover:bg-blue-700 transition-colors">
                      View Students
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Meet Section */}
              <div className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <TeamMeetCalendar
                      teamMeets={teamMeets}
                      onTeamMeetSelect={handleTeamMeetSelect}
                      currentUserId={coachUserId}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <TeamMeetSidebar
                      teamMeets={teamMeets}
                      onTeamMeetClick={handleTeamMeetSelect}
                      currentUserId={coachUserId}
                    />
                  </div>
                </div>
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
        currentUserId={coachUserId}
        readOnly={true}
      />
    </>
  );
}
