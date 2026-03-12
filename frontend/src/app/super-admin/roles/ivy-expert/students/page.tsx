'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface IvyStudent {
  _id: string;
  userId: string;
  studentDocId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  schoolName: string;
  curriculum: string;
  currentGrade: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentMobile: string;
  testStatus: string;
  totalScore: number | null;
  maxScore: number;
  completedSections: number;
  createdAt: string;
}

export default function IvyStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<IvyStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
      fetchStudents();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/super-admin/ivy-league/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (s: IvyStudent) =>
    [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');

  const getTestStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      'not-started': { label: 'Not Started', className: 'bg-gray-100 text-gray-800' },
      'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    };
    const s = map[status] || map['not-started'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.className}`}>
        {s.label}
      </span>
    );
  };

  const filteredStudents = students.filter((s) => {
    if (statusFilter && statusFilter !== s.testStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      getFullName(s).toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.schoolName.toLowerCase().includes(q)
    );
  });

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/super-admin/roles/ivy-expert')}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Ivy Students</h1>
              </div>
              <p className="text-gray-600 mt-1">Students assigned to an Ivy League expert</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Test Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{students.filter(s => s.testStatus === 'completed').length}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Test Pending</p>
                  <p className="text-3xl font-bold text-gray-900">{students.filter(s => s.testStatus !== 'completed').length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search by name, email, or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Test Status</option>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-2 text-gray-900 font-medium">No students found</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Grade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Test Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-600 font-semibold text-sm">
                                {s.firstName?.charAt(0)?.toUpperCase() || ''}{s.lastName?.charAt(0)?.toUpperCase() || ''}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{getFullName(s)}</div>
                              <div className="text-sm text-gray-500">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{s.schoolName}</div>
                          <div className="text-sm text-gray-500">{s.curriculum}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.currentGrade}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(s.testStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {s.testStatus === 'completed' && s.totalScore !== null
                            ? `${s.totalScore} / ${s.maxScore}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <button
                            onClick={() => router.push(`/super-admin/roles/student/${s.studentDocId || s.userId}`)}
                            className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination footer */}
            {filteredStudents.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </SuperAdminLayout>
    </>
  );
}
