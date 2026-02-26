'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface IvyCandidate {
  _id: string;
  userId: string;
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
  assignedIvyExpertId?: string | null;
  assignedExpertName?: string | null;
}

interface IvyExpertOption {
  _id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
}

export default function IvyCandidatesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [candidates, setCandidates] = useState<IvyCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const hasFetchedRef = useRef(false);

  // Convert to Student modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTarget, setConvertTarget] = useState<IvyCandidate | null>(null);
  const [ivyExperts, setIvyExperts] = useState<IvyExpertOption[]>([]);
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [converting, setConverting] = useState(false);

  // Assign Expert modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<IvyCandidate | null>(null);
  const [assignExpertId, setAssignExpertId] = useState('');
  const [assigning, setAssigning] = useState(false);

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
      fetchCandidates();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/super-admin/ivy-league/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCandidates(res.data.candidates);
      }
    } catch {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchIvyExperts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/super-admin/ivy-league/ivy-experts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setIvyExperts(res.data.experts);
      }
    } catch {
      toast.error('Failed to fetch ivy experts');
    }
  };

  const handleOpenConvert = (candidate: IvyCandidate) => {
    setConvertTarget(candidate);
    setSelectedExpertId('');
    setShowConvertModal(true);
    if (ivyExperts.length === 0) fetchIvyExperts();
  };

  const handleConvert = async () => {
    if (!convertTarget || !selectedExpertId) {
      toast.error('Please select an Ivy Expert');
      return;
    }
    setConverting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/super-admin/ivy-league/convert-to-student`,
        { userId: convertTarget.userId, ivyExpertId: selectedExpertId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success('Candidate converted to student successfully!');
        setShowConvertModal(false);
        setConvertTarget(null);
        setLoading(true);
        fetchCandidates();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert candidate');
    } finally {
      setConverting(false);
    }
  };

  const handleOpenAssign = (candidate: IvyCandidate) => {
    setAssignTarget(candidate);
    setAssignExpertId(candidate.assignedIvyExpertId || '');
    setShowAssignModal(true);
    if (ivyExperts.length === 0) fetchIvyExperts();
  };

  const handleAssignExpert = async () => {
    if (!assignTarget || !assignExpertId) {
      toast.error('Please select an Ivy Expert');
      return;
    }
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/super-admin/ivy-league/assign-expert`,
        { userId: assignTarget.userId, ivyExpertId: assignExpertId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success('Ivy Expert assigned successfully!');
        setShowAssignModal(false);
        setAssignTarget(null);
        setLoading(true);
        fetchCandidates();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign expert');
    } finally {
      setAssigning(false);
    }
  };

  const getCandidateName = (c: IvyCandidate) =>
    [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');

  const getExpertName = (e: IvyExpertOption) =>
    [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');

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

  const filteredCandidates = candidates.filter((c) => {
    if (statusFilter && statusFilter !== c.testStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      getCandidateName(c).toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.schoolName.toLowerCase().includes(q)
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
                <h1 className="text-3xl font-bold text-gray-900">Ivy Candidates</h1>
              </div>
              <p className="text-gray-600 mt-1">Students registered for Ivy League but not yet assigned an expert</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Candidates</p>
                  <p className="text-3xl font-bold text-gray-900">{candidates.length}</p>
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
                  <p className="text-3xl font-bold text-gray-900">{candidates.filter(c => c.testStatus === 'completed').length}</p>
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
                  <p className="text-3xl font-bold text-gray-900">{candidates.filter(c => c.testStatus !== 'completed').length}</p>
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
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-2 text-gray-900 font-medium">No candidates found</p>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Assigned Expert</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCandidates.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {c.firstName?.charAt(0)?.toUpperCase() || ''}{c.lastName?.charAt(0)?.toUpperCase() || ''}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{getCandidateName(c)}</div>
                              <div className="text-sm text-gray-500">{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{c.schoolName}</div>
                          <div className="text-sm text-gray-500">{c.curriculum}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.currentGrade}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(c.testStatus)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {c.testStatus === 'completed' && c.totalScore !== null
                            ? `${c.totalScore} / ${c.maxScore}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {c.assignedExpertName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {c.assignedExpertName}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not Assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex items-center justify-start gap-2">
                            <button
                              onClick={() => router.push(`/super-admin/roles/ivy-expert/candidates/${c.userId}`)}
                              className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleOpenAssign(c)}
                              className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-purple-600 text-white hover:bg-purple-700"
                            >
                              {c.assignedIvyExpertId ? 'Change Expert' : 'Assign Expert'}
                            </button>
                            <button
                              onClick={() => handleOpenConvert(c)}
                              className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-green-600 text-white hover:bg-green-700"
                            >
                              Convert to Student
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination footer */}
            {filteredCandidates.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Showing {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Convert to Student Modal */}
        {showConvertModal && convertTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Convert to Ivy Student</h2>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Student</p>
                <p className="text-base font-semibold text-gray-900">{getCandidateName(convertTarget)}</p>
                <p className="text-sm text-gray-500">{convertTarget.email}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Ivy Expert <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExpertId}
                  onChange={(e) => setSelectedExpertId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select an Ivy Expert...</option>
                  {ivyExperts.map((exp) => (
                    <option key={exp._id} value={exp._id}>
                      {getExpertName(exp)} ({exp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvert}
                  disabled={!selectedExpertId || converting}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {converting ? 'Converting...' : 'Convert'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Expert Modal */}
        {showAssignModal && assignTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {assignTarget.assignedIvyExpertId ? 'Change Ivy Expert' : 'Assign Ivy Expert'}
                </h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Candidate</p>
                <p className="text-base font-semibold text-gray-900">{getCandidateName(assignTarget)}</p>
                <p className="text-sm text-gray-500">{assignTarget.email}</p>
                {assignTarget.assignedExpertName && (
                  <p className="text-sm text-purple-600 mt-1">Currently assigned to: {assignTarget.assignedExpertName}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ivy Expert <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignExpertId}
                  onChange={(e) => setAssignExpertId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select an Ivy Expert...</option>
                  {ivyExperts.map((exp) => (
                    <option key={exp._id} value={exp._id}>
                      {getExpertName(exp)} ({exp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignExpert}
                  disabled={!assignExpertId || assigning}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigning ? 'Assigning...' : 'Assign Expert'}
                </button>
              </div>
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}
