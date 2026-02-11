'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName } from '@/utils/nameHelpers';

interface RoleStats {
  ADMIN?: number;
  OPS?: number;
  EDUPLAN_COACH?: number;
  IVY_EXPERT?: number;
  COUNSELOR?: number;
  STUDENT?: number;
  PARENT?: number;
  ALUMNI?: number;
  SERVICE_PROVIDER?: number;
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleStats, setRoleStats] = useState<RoleStats>({});

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied. Admins only.');
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

  const fetchStats = async () => {
    try {
      const response = await superAdminAPI.getStats();
      setRoleStats(response.data.data.byRole || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
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

  // Define role cards with their display info
  const roleCards = [
    { key: 'ADMIN', label: 'Admins', color: 'red', path: '/super-admin/roles/admin' },
    { key: 'OPS', label: 'Ops', color: 'green', path: '/super-admin/roles/ops' },
    { key: 'COUNSELOR', label: 'Counselors', color: 'teal', path: '/super-admin/roles/counselor' },
    { key: 'STUDENT', label: 'Students', color: 'blue', path: '/super-admin/roles/student' },
    { key: 'PARENT', label: 'Parents', color: 'amber', path: '/super-admin/roles/parent' },
    { key: 'IVY_EXPERT', label: 'Ivy Experts', color: 'purple', path: '/super-admin/roles/ivy-expert' },
    { key: 'EDUPLAN_COACH', label: 'EduPlan Coaches', color: 'indigo', path: '/super-admin/roles/eduplan-coach' },
    { key: 'ALUMNI', label: 'Alumni', color: 'pink', path: '/super-admin/roles/alumni' },
    { key: 'SERVICE_PROVIDER', label: 'Service Providers', color: 'orange', path: '/super-admin/roles/service-provider' },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{getFullName(user)}</h1>
          </div>

          {/* Role Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
            {roleCards.map((card) => (
              <RoleStatCard
                key={card.key}
                title={`${card.label}`}
                value={roleStats[card.key as keyof RoleStats] || 0}
                color={card.color as any}
                onClick={() => router.push(card.path)}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionButton
                onClick={() => router.push('/super-admin/roles/student')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                title="View All Students"
                description="Manage student data and registrations"
              />
              <ActionButton
                onClick={() => router.push('/super-admin/roles/admin')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                title="Manage Admins"
                description="Add and manage admin accounts"
              />
              <ActionButton
                onClick={() => router.push('/super-admin/users')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                title="User Management"
                description="Manage all system users"
              />
            </div>
          </div>
        </div>
      </SuperAdminLayout>
    </>
  );
}

interface RoleStatCardProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'indigo' | 'teal' | 'amber' | 'pink' | 'orange';
  onClick?: () => void;
}

function RoleStatCard({ title, value, color, onClick }: RoleStatCardProps) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  };

  const colorStyle = colorClasses[color] || colorClasses.blue;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorStyle.bg} ${colorStyle.text}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
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


