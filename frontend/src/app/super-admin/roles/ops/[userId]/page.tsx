'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, superAdminOpsAPI } from '@/lib/api';
import { User, USER_ROLE, OpsSchedule, OpsScheduleSummary, OpsScheduleStudent } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import OpsScheduleSidebar from '@/components/OpsScheduleSidebar';
import OpsScheduleFormPanel from '@/components/OpsScheduleFormPanel';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';

export default function SuperAdminOpsDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const opsUserId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [opsUser, setOpsUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Schedule states
  const [schedules, setSchedules] = useState<OpsSchedule[]>([]);
  const [summary, setSummary] = useState<OpsScheduleSummary>({ today: [], missed: [], tomorrow: [], counts: { today: 0, missed: 0, tomorrow: 0, total: 0 } });
  const [students, setStudents] = useState<OpsScheduleStudent[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<OpsSchedule | null>(null);
  const [showFormPanel, setShowFormPanel] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch schedule data for this ops user
  const fetchScheduleData = useCallback(async () => {
    try {
      const [schedulesRes, summaryRes, studentsRes] = await Promise.all([
        superAdminOpsAPI.getOpsSchedules(opsUserId),
        superAdminOpsAPI.getOpsSummary(opsUserId),
        superAdminOpsAPI.getOpsStudents(opsUserId),
      ]);

      setSchedules(schedulesRes.data.data.schedules || []);
      setSummary(summaryRes.data.data || { today: [], missed: [], tomorrow: [], counts: { today: 0, missed: 0, tomorrow: 0, total: 0 } });
      setStudents(studentsRes.data.data.students || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to fetch ops schedule data');
    }
  }, [opsUserId]);

  useEffect(() => {
    if (user && opsUserId) {
      fetchOpsDetail();
      fetchScheduleData();
    }
  }, [user, opsUserId, fetchScheduleData]);

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
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsDetail = async () => {
    try {
      const response = await superAdminOpsAPI.getOpsDetail(opsUserId);
      setOpsUser(response.data.data.user);
    } catch (error) {
      console.error('Error fetching ops detail:', error);
      toast.error('Failed to fetch ops user details');
    }
  };

  // Read-only: schedule click opens form panel in read-only mode
  const handleScheduleSelect = (schedule: OpsSchedule) => {
    setSelectedSchedule(schedule);
    setShowFormPanel(true);
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

  const opsDisplayName = opsUser ? getFullName(opsUser) : 'OPS User';

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Back Button + Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/super-admin/roles/ops')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Ops List
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{opsDisplayName}</h1>
            <p className="text-gray-500 mt-1">OPS Dashboard (Read-Only)</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div
              onClick={() => router.push(`/super-admin/roles/ops/${opsUserId}/students`)}
              className="cursor-pointer"
            >
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
            </div>
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

          {/* Calendar Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Calendar - Takes 3 columns on left */}
            <div className="lg:col-span-3">
              <OpsScheduleCalendar
                schedules={schedules}
                onScheduleSelect={handleScheduleSelect}
              />
            </div>

            {/* Sidebar - Takes 1 column on right */}
            <div className="lg:col-span-1">
              <OpsScheduleSidebar
                summary={summary}
                onScheduleClick={handleScheduleSelect}
                studentLinkPrefix="/super-admin/roles/student"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionButton
                onClick={() => router.push(`/super-admin/roles/ops/${opsUserId}/students`)}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                title="View Assigned Students"
                description="View students assigned to this ops"
              />
              <ActionButton
                onClick={() => router.push('/super-admin/roles/ops')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                title="Back to Ops List"
                description="Return to all ops users"
              />
            </div>
          </div>

          {/* Read-Only Schedule Form Panel */}
          <OpsScheduleFormPanel
            schedule={selectedSchedule}
            students={students}
            isOpen={showFormPanel}
            onClose={() => {
              setShowFormPanel(false);
              setSelectedSchedule(null);
            }}
            onSubmit={async () => {}}
            readOnly={true}
          />
        </div>
      </SuperAdminLayout>
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
