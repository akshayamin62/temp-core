'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { getFullName } from '@/utils/nameHelpers';
import TeamMeetCalendar from '@/components/TeamMeetCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function EduplanCoachDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);

  // TeamMeet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
  const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    checkAuth();
  }, []);

  const fetchTeamMeets = useCallback(async () => {
    try {
      const response = await teamMeetAPI.getTeamMeetsForCalendar();
      setTeamMeets(response.data.data.teamMeets);
    } catch (error: any) {
      console.error('Error fetching team meets:', error);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.EDUPLAN_COACH) {
        toast.error('Access denied. Eduplan Coach only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudentCount();
      fetchTeamMeets();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/super-admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudentCount(response.data.data.students?.length || 0);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // TeamMeet handlers
  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    const currentUserId = user?.id || user?._id;
    if (teamMeet.requestedTo._id === currentUserId && teamMeet.status === TEAMMEET_STATUS.PENDING_CONFIRMATION) {
      setTeamMeetPanelMode('respond');
    } else {
      setTeamMeetPanelMode('view');
    }
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetDateSelect = (date: Date) => {
    setSelectedTeamMeetDate(date);
    setSelectedTeamMeet(null);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  const handleScheduleTeamMeet = () => {
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetSave = async () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    await fetchTeamMeets();
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
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
      <EduplanCoachLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getFullName(user)}</h1>
              <p className="text-gray-600 mt-1">Welcome to Eduplan Coach Panel</p>
            </div>
            {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="text-right"><p className="text-3xl font-extrabold text-gray-900">Day {d}</p><p className="text-sm text-gray-500">of {t.getFullYear()}</p></div>); })()}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assigned Students</p>
                  <p className="text-3xl font-bold text-gray-900">{studentCount}</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/eduplan-coach/students')}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">View All Students</h3>
                  <p className="text-sm text-gray-600">Manage student data and registrations</p>
                </div>
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">View Services</h3>
                  <p className="text-sm text-gray-600">Browse all available services</p>
                </div>
              </button>
            </div>
          </div>

          {/* Team Meet Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <TeamMeetCalendar
                teamMeets={teamMeets}
                onTeamMeetSelect={handleTeamMeetSelect}
                onDateSelect={handleTeamMeetDateSelect}
                currentUserId={user?.id || user?._id}
              />
            </div>
            <div className="lg:col-span-1">
              <TeamMeetSidebar
                teamMeets={teamMeets}
                onTeamMeetClick={handleTeamMeetSelect}
                onScheduleClick={handleScheduleTeamMeet}
                currentUserId={user?.id || user?._id}
              />
            </div>
          </div>
        </div>
      </EduplanCoachLayout>

      {/* TeamMeet Slide-in Panel */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={handleTeamMeetSave}
        selectedDate={selectedTeamMeetDate}
        mode={teamMeetPanelMode}
        currentUserId={user?.id || user?._id}
      />
    </>
  );
}
