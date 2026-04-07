'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, archiveAPI, adminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';

interface StaffArchiveContentProps {
  allowedRoles: string[];
  Layout: React.ComponentType<{ children: React.ReactNode; user: User }>;
  studentDetailPath: string; // e.g. '/admin/students' → navigates to /admin/students/[studentId]
  parentDetailPath?: string; // e.g. '/admin/parents' → navigates to /admin/parents/[parentId]
  counselorDetailPath?: string; // e.g. '/admin/counselors' → navigates to /admin/counselors/[counselorId]
}

function StatCard({ title, value, color, onClick, active }: { title: string; value: string; color: string; onClick?: () => void; active?: boolean }) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    teal: 'bg-teal-100 text-teal-600',
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

export default function StaffArchiveContent({ allowedRoles, Layout, studentDetailPath, parentDetailPath, counselorDetailPath }: StaffArchiveContentProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (!allowedRoles.includes(userData.role)) {
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
      const response = await archiveAPI.getStaffArchive();
      const data = response.data.data;
      setStudents(data.students || []);
      setParents(data.parents || []);
      setCounselors(data.counselors || []);
    } catch (error: any) {
      toast.error('Failed to fetch archived data');
      console.error('Fetch archive error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build combined list
  const allItems = [
    ...(!typeFilter || typeFilter === 'student'
      ? students.map((s) => ({
          type: 'Student' as const,
          _id: s._id,
          userId: s.userId,
          name: getFullName(s.userId),
          email: s.userId?.email || '',
          details: s.adminId?.companyName || (s.counselorId ? getFullName(s.counselorId?.userId) : 'N/A'),
          createdAt: s.userId?.createdAt || s.createdAt,
          profilePicture: s.userId?.profilePicture,
          detailPath: studentDetailPath ? `${studentDetailPath}/${s._id}` : '',
        }))
      : []),
    ...(!typeFilter || typeFilter === 'parent'
      ? parents.map((p) => ({
          type: 'Parent' as const,
          _id: p._id,
          userId: p.userId,
          name: getFullName(p.userId),
          email: p.userId?.email || '',
          details:
            p.studentIds && p.studentIds.length > 0
              ? p.studentIds.map((s: any) => getFullName(s?.userId) || 'Unknown').join(', ')
              : 'No linked students',
          createdAt: p.userId?.createdAt || p.createdAt,
          profilePicture: p.userId?.profilePicture,
          detailPath: parentDetailPath ? `${parentDetailPath}/${p._id}` : '',
        }))
      : []),
    ...(!typeFilter || typeFilter === 'counselor'
      ? counselors.map((c) => ({
          type: 'Counselor' as const,
          _id: c._id,
          userId: c.userId,
          name: getFullName(c.userId),
          email: c.userId?.email || '',
          details: c.email || 'N/A',
          createdAt: c.userId?.createdAt || c.createdAt,
          profilePicture: c.userId?.profilePicture,
          detailPath: counselorDetailPath ? `${counselorDetailPath}/${c._id}` : '',
        }))
      : []),
  ];

  const filteredItems = allItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q)
    );
  });

  const totalStudents = students.length;
  const totalParents = parents.length;
  const totalCounselors = counselors.length;
  const totalArchived = totalStudents + totalParents + totalCounselors;
  const isAdmin = user?.role === USER_ROLE.ADMIN;

  const handleActivateCounselor = async (counselorId: string) => {
    try {
      await adminAPI.toggleCounselorStatus(counselorId);
      toast.success('Counselor activated successfully');
      fetchArchive();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to activate counselor');
    }
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

  return (
    <>
      <Toaster position="top-right" />
      <Layout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Archive</h1>
            <p className="text-gray-600 mt-1">Deactivated students{isAdmin ? ', parents and counselors' : ' and parents'}</p>
          </div>

          {/* Stats Cards */}
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-6`}>
            <StatCard
              title="Total Archived"
              value={totalArchived.toString()}
              color="red"
              onClick={() => setTypeFilter('')}
              active={!typeFilter}
            />
            <StatCard
              title="Archived Students"
              value={totalStudents.toString()}
              color="blue"
              onClick={() => setTypeFilter(typeFilter === 'student' ? '' : 'student')}
              active={typeFilter === 'student'}
            />
            <StatCard
              title="Archived Parents"
              value={totalParents.toString()}
              color="purple"
              onClick={() => setTypeFilter(typeFilter === 'parent' ? '' : 'parent')}
              active={typeFilter === 'parent'}
            />
            {isAdmin && (
              <StatCard
                title="Archived Counselors"
                value={totalCounselors.toString()}
                color="teal"
                onClick={() => setTypeFilter(typeFilter === 'counselor' ? '' : 'counselor')}
                active={typeFilter === 'counselor'}
              />
            )}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Types</option>
                  <option value="student">Students ({totalStudents})</option>
                  <option value="parent">Parents ({totalParents})</option>
                  {isAdmin && <option value="counselor">Counselors ({totalCounselors})</option>}
                </select>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('');
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={`${item.type}-${item._id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={item.profilePicture}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover mr-3"
                              fallback={
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-red-600 font-semibold text-sm">{getInitials(item.userId)}</span>
                                </div>
                              }
                            />
                            <div>
                              <div className="font-medium text-gray-900">{item.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">
                                Joined {new Date(item.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            item.type === 'Student' ? 'bg-blue-100 text-blue-800' : item.type === 'Counselor' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.details}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Deactivated
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {item.detailPath && (
                              <button
                                onClick={() => router.push(item.detailPath)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                View Detail
                              </button>
                            )}
                            {isAdmin && item.type === 'Counselor' && (
                              <button
                                onClick={() => handleActivateCounselor(item._id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                Activate
                              </button>
                            )}
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
                            {searchQuery || typeFilter
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
          {totalArchived > 0 && (
            <div className="mt-6 text-sm text-gray-600">
              Showing {filteredItems.length} of {totalArchived} total archived
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
