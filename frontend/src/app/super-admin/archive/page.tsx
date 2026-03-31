'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, archiveAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import { BACKEND_URL } from '@/lib/ivyApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  PARENT: 'Parent',
  ADMIN: 'Admin',
  COUNSELOR: 'Counselor',
  OPS: 'Ops',
  IVY_EXPERT: 'Ivy Expert',
  EDUPLAN_COACH: 'EduPlan Coach',
  ALUMNI: 'Alumni',
  SERVICE_PROVIDER: 'Service Provider',
};

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-blue-100 text-blue-800',
  PARENT: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-indigo-100 text-indigo-800',
  COUNSELOR: 'bg-teal-100 text-teal-800',
  OPS: 'bg-amber-100 text-amber-800',
  IVY_EXPERT: 'bg-emerald-100 text-emerald-800',
  EDUPLAN_COACH: 'bg-cyan-100 text-cyan-800',
  ALUMNI: 'bg-gray-100 text-gray-800',
  SERVICE_PROVIDER: 'bg-rose-100 text-rose-800',
};

function StatCard({ title, value, color, onClick, active }: { title: string; value: string; color: string; onClick?: () => void; active?: boolean }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border ${active ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'} p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminArchivePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
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
      fetchArchive();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const response = await archiveAPI.getSuperAdminArchive();
      const data = response.data.data;
      setArchivedUsers(data.users || []);
      setRoleCounts(data.roleCounts || {});
    } catch (error: any) {
      toast.error('Failed to fetch archived users');
      console.error('Fetch archive error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = archivedUsers.filter((u) => {
    const query = searchQuery.toLowerCase();
    const name = getFullName(u).toLowerCase();
    const matchesSearch =
      name.includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      (u.profile?.companyName || '').toLowerCase().includes(query);

    const matchesRole = !roleFilter || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleReactivate = async (userId: string) => {
    try {
      setActionLoading(userId);
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/super-admin/users/${userId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User reactivated successfully');
      await fetchArchive();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  const getProfileInfo = (u: any): string => {
    if (u.role === 'STUDENT') {
      return u.profile?.adminId?.companyName || 'No admin';
    }
    if (u.role === 'PARENT') {
      const kids = u.profile?.studentIds || [];
      if (kids.length === 0) return 'No linked students';
      return kids.map((k: any) => getFullName(k?.userId) || 'Unknown').join(', ');
    }
    if (u.role === 'ADMIN') {
      return u.profile?.companyName || '';
    }
    return u.profile?.email || '';
  };

  const getDetailPath = (u: any): string => {
    const profileId = u.profile?._id;
    switch (u.role) {
      case 'STUDENT':
        return profileId ? `/super-admin/roles/student/${profileId}` : '';
      case 'PARENT':
        return profileId ? `/super-admin/roles/parent/${profileId}` : '';
      case 'ADMIN':
        return `/super-admin/roles/admin/${u._id}`;
      case 'COUNSELOR':
        return `/super-admin/roles/counselor/${u._id}`;
      case 'OPS':
        return `/super-admin/roles/ops/${u._id}`;
      case 'IVY_EXPERT':
        return `/super-admin/roles/ivy-expert/${u._id}`;
      case 'EDUPLAN_COACH':
        return `/super-admin/roles/eduplan-coach/${u._id}`;
      case 'SERVICE_PROVIDER':
        return `/super-admin/roles/service-provider/${u._id}`;
      default:
        return '';
    }
  };

  const totalArchived = archivedUsers.length;
  const studentCount = roleCounts['STUDENT'] || 0;
  const parentCount = roleCounts['PARENT'] || 0;
  const staffCount = totalArchived - studentCount - parentCount;

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

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
            <p className="text-gray-600 mt-1">Deactivated users across all roles</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Total Archived"
              value={totalArchived.toString()}
              color="red"
              onClick={() => setRoleFilter('')}
              active={!roleFilter}
            />
            <StatCard
              title="Archived Students"
              value={studentCount.toString()}
              color="blue"
              onClick={() => setRoleFilter(roleFilter === 'STUDENT' ? '' : 'STUDENT')}
              active={roleFilter === 'STUDENT'}
            />
            <StatCard
              title="Archived Parents"
              value={parentCount.toString()}
              color="purple"
              onClick={() => setRoleFilter(roleFilter === 'PARENT' ? '' : 'PARENT')}
              active={roleFilter === 'PARENT'}
            />
            <StatCard
              title="Archived Staff"
              value={staffCount.toString()}
              color="amber"
              onClick={() => {
                // Toggle between showing all staff and showing all
                if (['ADMIN', 'COUNSELOR', 'OPS', 'IVY_EXPERT', 'EDUPLAN_COACH'].includes(roleFilter)) {
                  setRoleFilter('');
                }
              }}
            />
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Roles</option>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label} {roleCounts[key] ? `(${roleCounts[key]})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('');
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u: any) => (
                      <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {u.profilePicture ? (
                              <img src={`${BACKEND_URL}/uploads/${u.profilePicture}`} alt="" className="w-10 h-10 rounded-full object-cover mr-3" />
                            ) : (
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-red-600 font-semibold text-sm">{getInitials(u)}</span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{getFullName(u) || 'N/A'}</div>
                              <div className="text-sm text-gray-500">
                                Joined {new Date(u.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {getProfileInfo(u)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Deactivated
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {getDetailPath(u) && (
                              <button
                                onClick={() => router.push(getDetailPath(u))}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                View Detail
                              </button>
                            )}
                            <button
                              onClick={() => handleReactivate(u._id)}
                              disabled={actionLoading === u._id}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs font-medium"
                            >
                              {actionLoading === u._id ? 'Activating...' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-400">
                          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <p className="text-lg font-medium text-gray-900 mb-1">No archived users found</p>
                          <p className="text-sm text-gray-500">
                            {searchQuery || roleFilter
                              ? 'Try adjusting your filters'
                              : 'Deactivated users will appear here'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count */}
          {archivedUsers.length > 0 && (
            <div className="mt-6 text-sm text-gray-600">
              Showing {filteredUsers.length} of {totalArchived} total archived users
            </div>
          )}
        </div>
      </SuperAdminLayout>
    </>
  );
}
