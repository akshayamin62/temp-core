'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, opsScheduleAPI, teamMeetAPI } from '@/lib/api';
import { User, USER_ROLE, OpsSchedule, OpsScheduleSummary, OpsScheduleStudent, CreateOpsScheduleData, TeamMeet, TEAMMEET_STATUS } from '@/types';
import OpsLayout from '@/components/OpsLayout';
import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';
import OpsScheduleOverview from '@/components/OpsScheduleOverview';
import TeamMeetFormPanel from '@/components/TeamMeetFormPanel';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';
import { format } from 'date-fns';

export default function OpsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Schedule states
  const [schedules, setSchedules] = useState<OpsSchedule[]>([]);
  const [summary, setSummary] = useState<OpsScheduleSummary>({ today: [], missed: [], tomorrow: [], counts: { today: 0, missed: 0, tomorrow: 0, total: 0 } });
  const [students, setStudents] = useState<OpsScheduleStudent[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<OpsSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // TeamMeet states
  const [teamMeets, setTeamMeets] = useState<TeamMeet[]>([]);
  const [selectedTeamMeet, setSelectedTeamMeet] = useState<TeamMeet | null>(null);
  const [showTeamMeetPanel, setShowTeamMeetPanel] = useState(false);
  const [selectedTeamMeetDate, setSelectedTeamMeetDate] = useState<Date | undefined>(undefined);
  const [teamMeetPanelMode, setTeamMeetPanelMode] = useState<'create' | 'view' | 'respond'>('create');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Date selection choice state — removed: now opens OPS schedule directly

  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch schedule data
  const fetchScheduleData = useCallback(async () => {
    try {
      const [schedulesRes, summaryRes, studentsRes] = await Promise.all([
        opsScheduleAPI.getMySchedules(),
        opsScheduleAPI.getSummary(),
        opsScheduleAPI.getMyStudents(),
      ]);
      
      setSchedules(schedulesRes.data.data.schedules || []);
      setSummary(summaryRes.data.data || { today: [], missed: [], tomorrow: [], counts: { today: 0, missed: 0, tomorrow: 0, total: 0 } });
      setStudents(studentsRes.data.data.students || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    }
  }, []);

  // Fetch TeamMeet data
  const fetchTeamMeetData = useCallback(async () => {
    try {
      const res = await teamMeetAPI.getTeamMeetsForCalendar();
      setTeamMeets(res.data.data.teamMeets || []);
    } catch (error) {
      console.error('Error fetching team meets:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchScheduleData();
      fetchTeamMeetData();
    }
  }, [user, fetchScheduleData, fetchTeamMeetData]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.OPS) {
        toast.error('Access denied. Ops only.');
        router.push('/');
        return;
      }

      setUser(userData);
      setCurrentUserId(userData._id);
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Handle schedule selection from calendar or sidebar
  const handleScheduleSelect = (schedule: OpsSchedule) => {
    setSelectedSchedule(schedule);
    setSelectedDate(null);
    setShowFormPanel(true);
  };

  // Handle date selection from calendar — open OPS schedule form directly
  const handleDateSelect = (date: Date) => {
    setSelectedSchedule(null);
    setSelectedDate(date);
    setShowFormPanel(true);
  };

  // Handle switching from OPS form to TeamMeet form (preserving date)
  const handleSwitchToTeamMeet = () => {
    const dateToUse = selectedDate || (selectedSchedule ? new Date(selectedSchedule.scheduledDate) : new Date());
    setShowFormPanel(false);
    setSelectedSchedule(null);
    setSelectedDate(null);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(dateToUse);
    setTeamMeetPanelMode('create');
    setShowTeamMeetPanel(true);
  };

  // Handle switching from TeamMeet form to OPS form (preserving date)
  const handleSwitchToTask = () => {
    const dateToUse = selectedTeamMeetDate || (selectedTeamMeet ? new Date(selectedTeamMeet.scheduledDate) : new Date());
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
    setSelectedSchedule(null);
    setSelectedDate(dateToUse);
    setShowFormPanel(true);
  };

  // Handle creating new schedule
  const handleCreateNew = () => {
    setSelectedSchedule(null);
    setSelectedDate(new Date());
    setShowFormPanel(true);
  };

  // Handle form submission
  const handleFormSubmit = async (data: CreateOpsScheduleData) => {
    setFormLoading(true);
    try {
      if (selectedSchedule) {
        // Update existing schedule
        await opsScheduleAPI.updateSchedule(selectedSchedule._id, data);
        toast.success('Schedule updated successfully');
      } else {
        // Create new schedule
        await opsScheduleAPI.createSchedule(data);
        toast.success('Schedule created successfully');
      }
      
      setShowFormPanel(false);
      setSelectedSchedule(null);
      setSelectedDate(null);
      await fetchScheduleData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save schedule');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle schedule deletion
  const handleDelete = async () => {
    if (!selectedSchedule) return;
    
    setFormLoading(true);
    try {
      await opsScheduleAPI.deleteSchedule(selectedSchedule._id);
      toast.success('Schedule deleted successfully');
      
      setShowFormPanel(false);
      setSelectedSchedule(null);
      await fetchScheduleData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle cancel form
  const handleCancel = () => {
    setShowFormPanel(false);
    setSelectedSchedule(null);
    setSelectedDate(null);
  };

  // ── TeamMeet handlers ──
  const handleTeamMeetSelect = (teamMeet: TeamMeet) => {
    setSelectedTeamMeet(teamMeet);
    setSelectedTeamMeetDate(undefined);
    const currentId = user?._id || currentUserId;
    // Match counselor pattern: recipient with pending status → respond mode
    if (
      teamMeet.status === TEAMMEET_STATUS.PENDING_CONFIRMATION &&
      (String(teamMeet.requestedTo._id) === String(currentId) ||
        String((teamMeet.requestedTo as any).id) === String(currentId))
    ) {
      setTeamMeetPanelMode('respond');
    } else {
      setTeamMeetPanelMode('view');
    }
    setShowTeamMeetPanel(true);
  };

  const handleTeamMeetPanelClose = () => {
    setShowTeamMeetPanel(false);
    setSelectedTeamMeet(null);
    setSelectedTeamMeetDate(undefined);
  };

  const handleTeamMeetSave = () => {
    fetchTeamMeetData();
    handleTeamMeetPanelClose();
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
      <OpsLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getFullName(user)}</h1>
            </div>
            {(() => { const t = new Date(); const d = Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 0).getTime()) / 86400000); return (<div className="text-right"><p className="text-3xl font-extrabold text-gray-900">Day {d}</p><p className="text-sm text-gray-500">of {t.getFullYear()}</p></div>); })()}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Assigned Students"
              value={students.length.toString()}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title="Today's Schedules"
              value={summary.today.length.toString()}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              color="green"
            />
            <StatCard
              title="Missed Schedules"
              value={summary.missed.length.toString()}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              color="yellow"
            />
          </div>

          {/* Unified Calendar Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
              <OpsScheduleCalendar
                schedules={schedules}
                onScheduleSelect={handleScheduleSelect}
                onDateSelect={handleDateSelect}
                teamMeets={teamMeets}
                onTeamMeetSelect={handleTeamMeetSelect}
                currentUserId={currentUserId}
              />
            </div>
            <div className="lg:col-span-1">
              <OpsScheduleOverview
                opsTasks={schedules}
                teamMeets={teamMeets}
                onTaskClick={handleScheduleSelect}
                onTeamMeetClick={handleTeamMeetSelect}
                onScheduleClick={() => { setSelectedSchedule(null); setSelectedDate(new Date()); setShowFormPanel(true); }}
                onScheduleTeamMeet={() => { setSelectedTeamMeet(null); setSelectedTeamMeetDate(new Date()); setTeamMeetPanelMode('create'); setShowTeamMeetPanel(true); }}
                currentUserId={user?._id || currentUserId}
              />
            </div>
          </div>

      {/* OPS Schedule Form Panel - Slide-in from left (overlay) */}
      <OpsScheduleFormPanel
        schedule={selectedSchedule}
        students={students}
        selectedDate={selectedDate}
        isOpen={showFormPanel}
        onClose={handleCancel}
        onSubmit={handleFormSubmit}
        onDelete={selectedSchedule ? handleDelete : undefined}
        isLoading={formLoading}
        onSwitchToTeamMeet={handleSwitchToTeamMeet}
      />

      {/* TeamMeet Form Panel */}
      <TeamMeetFormPanel
        teamMeet={selectedTeamMeet}
        isOpen={showTeamMeetPanel}
        onClose={handleTeamMeetPanelClose}
        onSave={handleTeamMeetSave}
        selectedDate={selectedTeamMeetDate}
        mode={teamMeetPanelMode}
        currentUserId={user?._id || currentUserId}
        onSwitchToTask={handleSwitchToTask}
      />

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionButton
                onClick={() => router.push('/ops/students')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                title="View All Students"
                description="Manage student data and registrations"
              />
              <ActionButton
                onClick={() => router.push('/')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                title="View Services"
                description="Browse all available services"
              />
            </div>
          </div>
        </div>
      </OpsLayout>
    </>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ActionButton({ onClick, icon, title, description }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all text-left group"
    >
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
}


