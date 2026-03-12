'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

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
}

const TEST_STATUS_OPTIONS = [
  { value: '', label: 'All Test Status' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function getTestStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    'not-started': { label: 'Not Started', className: 'bg-gray-100 text-gray-700' },
    'in-progress': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  };
  const s = map[status] || map['not-started'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function IvyCandidatesContent() {
  const router = useRouter();
  const [myCandidates, setMyCandidates] = useState<IvyCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${IVY_API_URL}/ivy-expert-candidates/my-candidates`);
        if (res.data.success) setMyCandidates(res.data.candidates);
      } catch (err: any) {
        console.error('Error fetching candidates:', err);
        setError('Failed to load candidates');
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const getCandidateName = (c: IvyCandidate) =>
    [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');

  const filteredCandidates = myCandidates.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      getCandidateName(c).toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.schoolName || '').toLowerCase().includes(q);
    const matchesStatus = !statusFilter || c.testStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = myCandidates.length;
  const completed = myCandidates.filter((c) => c.testStatus === 'completed').length;
  const notStarted = myCandidates.filter((c) => !c.testStatus || c.testStatus === 'not-started').length;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/ivy-league/ivy-expert')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Ivy Candidates</h1>
        <p className="text-gray-600 mt-1">Candidates assigned to you for evaluation</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Candidates</p>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
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
          onClick={() => { setSearchQuery(''); setStatusFilter('completed'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Test Completed</p>
              <p className="text-3xl font-bold text-gray-900">{completed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => { setSearchQuery(''); setStatusFilter('not-started'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Not Started</p>
              <p className="text-3xl font-bold text-gray-900">{notStarted}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by name, email or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900"
            >
              {TEST_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">School</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Test Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                          <span className="text-amber-600 font-semibold text-sm">
                            {c.firstName?.charAt(0)?.toUpperCase() || ''}{c.lastName?.charAt(0)?.toUpperCase() || ''}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{getCandidateName(c)}</div>
                          <div className="text-sm text-gray-500">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{c.schoolName || '—'}</div>
                      <div className="text-sm text-gray-500">{c.curriculum || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.currentGrade || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getTestStatusBadge(c.testStatus)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {c.testStatus === 'completed' && c.totalScore !== null
                        ? `${c.totalScore} / ${c.maxScore}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/ivy-league/ivy-expert/candidates/${c.userId}`)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-1">No candidates found</p>
                    <p className="text-sm text-gray-500">
                      {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Candidates will appear once assigned to you'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {myCandidates.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {filteredCandidates.length} of {myCandidates.length} candidates
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IvyCandidatesPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" /></div>}>
      <IvyCandidatesContent />
    </Suspense>
  );
}
