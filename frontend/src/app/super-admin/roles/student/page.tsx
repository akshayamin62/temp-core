'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, superAdminAPI } from '@/lib/api';
import { User, USER_ROLE, SERVICE_TYPE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentData {
  _id: string;
  user: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    isActive: boolean;
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
  counselorId?: {
    _id: string;
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
  hasPendingAssignment?: boolean;
}

interface UserStats {
  total: number;
  active: number;
  pendingOpsAssignments: number;
}

// Stat Card Component
function StatCard({ title, value, color, onClick }: { title: string; value: string; color: string; onClick?: () => void }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function StudentUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingFilter, setPendingFilter] = useState(false);
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, pendingOpsAssignments: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editLeadData, setEditLeadData] = useState<Record<string, any> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editFetching, setEditFetching] = useState(false);

  const getServiceColor = (service: string) => {
    switch (service) {
      case SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD:
        return 'bg-indigo-100 text-indigo-800';
      case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
        return 'bg-amber-100 text-amber-800';
      case SERVICE_TYPE.EDUCATION_PLANNING:
        return 'bg-teal-100 text-teal-800';
      case SERVICE_TYPE.COACHING_CLASSES:
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN && userData.role !== USER_ROLE.OPS) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudents();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/super-admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedStudents = response.data.data.students;
      const pendingOpsAssignments = response.data.data.pendingOpsAssignments || 0;
      const pendingStudentIds = response.data.data.pendingStudentIds || [];
      console.log('📊 Pending student IDs from backend:', pendingStudentIds);
      setStudents(fetchedStudents.map((s: StudentData) => {
        const isPending = pendingStudentIds.includes(s._id.toString());
        return {
          ...s,
          hasPendingAssignment: isPending
        };
      }));
      
      // Calculate stats (only active students shown in this view)
      const activeStudents = fetchedStudents.filter((s: StudentData) => s.user.isActive);
      setStats({
        total: activeStudents.length,
        active: activeStudents.length,
        pendingOpsAssignments: pendingOpsAssignments,
      });
    } catch (error: any) {
      toast.error('Failed to fetch students');
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const studentName = getFullName(student.user).toLowerCase();
    const matchesSearch = 
      studentName.includes(query) ||
      student.user.email.toLowerCase().includes(query) ||
      student.mobileNumber?.includes(query) ||
      student.adminId?.companyName?.toLowerCase().includes(query);
    
    const matchesPending = !pendingFilter || student.hasPendingAssignment;
    
    return matchesSearch && matchesPending && student.user.isActive !== false;
  });

  const handleViewStudent = (studentId: string) => {
    router.push(`/super-admin/roles/student/${studentId}`);
  };

  const handleToggleStatus = async (studentId: string) => {
    try {
      setActionLoading(studentId);
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/super-admin/users/${studentId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Student status updated');
      await fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  // Edit handlers
  const handleOpenEdit = async (userId: string) => {
    try {
      setEditUserId(userId);
      setEditFetching(true);
      setShowEditModal(true);
      const res = await superAdminAPI.getUserWithProfile(userId);
      const { user: u, profile, lead } = res.data.data;
      setEditFormData({
        firstName: u.firstName || '',
        middleName: u.middleName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        mobileNumber: profile?.mobileNumber || '',
        intake: profile?.intake || '',
        year: profile?.year || '',
      });
      if (lead) {
        setEditLeadData({
          name: lead.name || '',
          email: lead.email || '',
          mobileNumber: lead.mobileNumber || '',
          city: lead.city || '',
          serviceTypes: lead.serviceTypes || [],
          intake: lead.intake || '',
          year: lead.year || '',
          stage: lead.stage || '',
          source: lead.source || '',
        });
      } else {
        setEditLeadData(null);
      }
    } catch (error: any) {
      toast.error('Failed to load user details');
      setShowEditModal(false);
    } finally {
      setEditFetching(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    if (!editFormData.firstName?.trim() || !editFormData.lastName?.trim() || !editFormData.email?.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    try {
      setEditLoading(true);
      const payload: Record<string, any> = {
        firstName: editFormData.firstName.trim(),
        middleName: editFormData.middleName?.trim() || undefined,
        lastName: editFormData.lastName.trim(),
        email: editFormData.email.trim(),
        mobileNumber: editFormData.mobileNumber?.trim() || undefined,
        intake: editFormData.intake?.trim() || undefined,
        year: editFormData.year?.trim() || undefined,
      };
      if (editLeadData) {
        payload.leadData = {
          name: editLeadData.name?.trim(),
          email: editLeadData.email?.trim(),
          mobileNumber: editLeadData.mobileNumber?.trim(),
          city: editLeadData.city?.trim(),
          serviceTypes: editLeadData.serviceTypes,
          intake: editLeadData.intake?.trim(),
          year: editLeadData.year?.trim(),
          stage: editLeadData.stage,
          source: editLeadData.source?.trim(),
        };
      }
      await superAdminAPI.editUserByRole(editUserId, payload);
      toast.success('Student updated successfully');
      setShowEditModal(false);
      setEditUserId(null);
      setEditLeadData(null);
      await fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update student');
    } finally {
      setEditLoading(false);
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
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">Manage all student accounts</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard 
              title="Total Students" 
              value={stats.total.toString()} 
              color="blue" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPendingFilter(false);
              }}
            />
            <StatCard 
              title="Active Students" 
              value={stats.active.toString()} 
              color="green" 
              onClick={() => {
                setStatusFilter('active');
                setPendingFilter(false);
              }}
            />
            <StatCard 
              title="Pending Assignment" 
              value={stats.pendingOpsAssignments.toString()} 
              color="purple" 
              onClick={() => setPendingFilter(!pendingFilter)}
            />
          </div>

          {/* Active Filters Banner */}
          {pendingFilter && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-purple-900 font-medium">Showing students with pending assignments</span>
              </div>
              <button
                onClick={() => setPendingFilter(false)}
                className="text-purple-600 hover:text-purple-800 font-medium text-sm"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search by name, email, mobile, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                </select>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('');
                    setPendingFilter(false);
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Registrations
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <AuthImage
                              path={student.user.profilePicture}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover mr-3"
                              fallback={
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {getInitials(student.user)}
                                  </span>
                                </div>
                              }
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {getFullName(student.user) || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                Joined {new Date(student.createdAt).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.adminId?.companyName || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {student.serviceNames && student.serviceNames.length > 0 ? (
                              student.serviceNames.map((service, idx) => (
                                <span key={idx} className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(service)}`}>
                                  {service}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400">No services</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              student.user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewStudent(student._id)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleOpenEdit(student.user._id)}
                              className="px-3 py-1.5 rounded-lg transition-colors text-xs font-medium bg-brand-600 text-white hover:bg-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(student.user._id)}
                              disabled={actionLoading === student.user._id}
                              className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs font-medium ${
                                student.user.isActive
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {student.user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-400">
                          <svg
                            className="w-12 h-12 mx-auto mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <p className="text-lg font-medium text-gray-900 mb-1">
                            No students found
                          </p>
                          <p className="text-sm text-gray-500">
                            {searchQuery
                              ? 'Try adjusting your search'
                              : 'Students will appear here once they register'}
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
          {students.length > 0 && (
            <div className="mt-6 text-sm text-gray-600">
              Showing {filteredStudents.length} of {students.length} total students
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                <h3 className="text-xl font-bold text-gray-900">Edit Student</h3>
                <p className="text-sm text-gray-500 mt-1">Update user, student profile{editLeadData ? ', and lead' : ''} information</p>
              </div>
              {editFetching ? (
                <div className="p-12 text-center">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading details...</p>
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                  {/* User Information */}
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">User Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editFormData.firstName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        required
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={editFormData.middleName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, middleName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editFormData.lastName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        required
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Student Profile */}
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Student Profile</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={editFormData.mobileNumber || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^[+()\-\s.0-9]*$/.test(value)) {
                            setEditFormData({ ...editFormData, mobileNumber: value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Intake</label>
                      <input
                        type="text"
                        value={editFormData.intake || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, intake: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                        placeholder="e.g. Fall"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                      <input
                        type="text"
                        value={editFormData.year || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                        placeholder="e.g. 2026"
                      />
                    </div>
                  </div>

                  {/* Lead Information (if converted from lead) */}
                  {editLeadData && (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Lead Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Name</label>
                          <input
                            type="text"
                            value={editLeadData.name || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Email</label>
                          <input
                            type="email"
                            value={editLeadData.email || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Phone</label>
                          <input
                            type="tel"
                            value={editLeadData.mobileNumber || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, mobileNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={editLeadData.city || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, city: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Stage</label>
                          <select
                            value={editLeadData.stage || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, stage: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          >
                            <option value="">Select</option>
                            <option value="New">New</option>
                            <option value="Hot">Hot</option>
                            <option value="Warm">Warm</option>
                            <option value="Cold">Cold</option>
                            <option value="Converted to Student">Converted to Student</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                          <input
                            type="text"
                            value={editLeadData.source || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, source: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Intake</label>
                          <input
                            type="text"
                            value={editLeadData.intake || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, intake: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Year</label>
                          <input
                            type="text"
                            value={editLeadData.year || ''}
                            onChange={(e) => setEditLeadData({ ...editLeadData, year: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Service Types</label>
                          <div className="flex flex-wrap gap-2">
                            {['Education Planning', 'Career Focus Study Abroad', 'Ivy League Admission', 'Coaching Classes'].map((st) => (
                              <label key={st} className="flex items-center gap-1.5 text-xs bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 opacity-60 cursor-not-allowed">
                                <input
                                  type="checkbox"
                                  checked={editLeadData.serviceTypes?.includes(st) || false}
                                  onChange={() => {}}
                                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                  disabled
                                />
                                {st}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setShowEditModal(false); setEditUserId(null); setEditLeadData(null); }}
                      className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {editLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}
