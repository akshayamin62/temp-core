'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE, TeamMeet, TEAMMEET_STATUS } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentService {
  _id: string;
  studentId: {
    _id: string;
    userId?: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: string;
  createdAt: string;
}

interface IvyExpertUser {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
}

interface IvyCandidate {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  assignedIvyExpertId?: string;
}

export default function IvyExpertDashboardReadOnlyPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [ivyExpertUser, setIvyExpertUser] = useState<IvyExpertUser | null>(null);
  const [students, setStudents] = useState<StudentService[]>([]);
  const [ivyExpertId, setIvyExpertId] = useState<string>('');
  const [candidateCount, setCandidateCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Team Meet state
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'view'>('view');
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchData();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch ivy expert user info
      try {
        const userResponse = await axios.get(`${API_URL}/super-admin/users`, {
          headers,
          params: { search: '', role: 'ivy-expert' },
        });
        const users = userResponse.data.data.users || [];
        const found = users.find((u: any) => (u._id || u.id) === userId);
        if (found) {
          setIvyExpertUser(found);
        }
      } catch (err) {
        console.error('Failed to fetch ivy expert user info:', err);
      }

      // Fetch students assigned to this ivy expert
      try {
        const studentsResponse = await axios.get(
          `${IVY_API_URL}/ivy-service/user/${userId}/students`,
          { headers }
        );
        setStudents(studentsResponse.data.data || []);
        setIvyExpertId(studentsResponse.data.ivyExpertId || '');

        // Fetch candidates and filter by this expert's ivyExpertId
        const expertDocId = studentsResponse.data.ivyExpertId;
        if (expertDocId) {
          try {
            const candidatesRes = await axios.get(`${API_URL}/super-admin/ivy-league/candidates`, { headers });
            const allCandidates: IvyCandidate[] = candidatesRes.data.data?.candidates || [];
            const myCandidates = allCandidates.filter((c) => c.assignedIvyExpertId === expertDocId);
            setCandidateCount(myCandidates.length);
          } catch (err) {
            console.error('Failed to fetch candidates:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch students:', err);
      }

      // Fetch team meets for this ivy expert
      try {
        const tmRes = await axios.get(`${API_URL}/super-admin/ivy-experts/${userId}/team-meets`, { headers });
        if (tmRes.data.success) {
          setTeamMeets(tmRes.data.data.teamMeets || []);
        }
      } catch (err) {
        console.error('Failed to fetch team meets:', err);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (service: StudentService) => {
    const queryParams = new URLSearchParams({
      studentId: service.studentId._id,
      studentIvyServiceId: service._id,
      ...(service.studentId.userId ? { userId: service.studentId.userId } : {}),
      ...(ivyExpertId ? { ivyExpertId } : {}),
      readOnly: 'true',
    });
    router.push(`/ivy-league/student?${queryParams.toString()}`);
  };

  const handleViewTeamMeet = (tm: TeamMeet) => {
    setSelectedTeamMeet(tm);
    setTeamMeetPanelMode('view');
    setShowTeamMeetPanel(true);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const expertName = ivyExpertUser
    ? `${ivyExpertUser.firstName}${ivyExpertUser.middleName ? ' ' + ivyExpertUser.middleName : ''} ${ivyExpertUser.lastName}`
    : 'Ivy Expert';

  const upcomingMeetings = teamMeets.filter(
    (t) => t.status === TEAMMEET_STATUS.CONFIRMED || t.status === TEAMMEET_STATUS.PENDING_CONFIRMATION
  ).length;

  return (
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {/* Read-Only Banner */}
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Read-Only — Viewing Ivy Expert Dashboard</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/super-admin/roles/ivy-expert')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Ivy Experts
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {expertName}&apos;s Dashboard
          </h1>
          {ivyExpertUser?.email && (
            <p className="text-gray-500 mt-1">{ivyExpertUser.email}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/super-admin/roles/ivy-expert/candidates')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ivy Candidates</p>
                <p className="text-3xl font-bold text-gray-900">{candidateCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/super-admin/roles/ivy-expert/students')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ivy Students</p>
                <p className="text-3xl font-bold text-gray-900">{students.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Upcoming Meetings</p>
                <p className="text-3xl font-bold text-gray-900">{upcomingMeetings}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Calendar */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OpsScheduleCalendar
                schedules={[]}
                onScheduleSelect={() => {}}
                teamMeets={teamMeets}
                onTeamMeetSelect={handleViewTeamMeet}
                currentUserId=""
              />
            </div>
            <div>
              <TeamMeetSidebar
                teamMeets={teamMeets}
                onTeamMeetClick={handleViewTeamMeet}
                currentUserId=""
              />
            </div>
          </div>
        </div>

      </div>

      {/* Team Meet View-Only Panel */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={() => { setShowTeamMeetPanel(false); setSelectedTeamMeet(null); }}
        onSave={async () => { setShowTeamMeetPanel(false); setSelectedTeamMeet(null); }}
        mode={teamMeetPanelMode}
        currentUserId=""
      />
    </SuperAdminLayout>
  );
}
