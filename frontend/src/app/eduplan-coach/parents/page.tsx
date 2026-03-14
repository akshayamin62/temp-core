'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, parentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import { BACKEND_URL } from '@/lib/ivyApi';

interface ParentData {
  _id: string;
  userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string; isActive: boolean; createdAt: string };
  studentIds: { _id: string; userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string } }[];
  email: string;
  relationship: string;
  mobileNumber: string;
}

export default function EduplanCoachParentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [parents, setParents] = useState<ParentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    authAPI.getProfile().then(res => {
      const u = res.data.data.user;
      if (u.role !== USER_ROLE.EDUPLAN_COACH) { router.push('/login'); return; }
      setUser(u);
      fetchParents();
    }).catch(() => router.push('/login'));
  }, [router]);

  const fetchParents = async () => {
    try {
      const response = await parentAPI.getMyParents();
      setParents(response.data.data.parents);
    } catch { toast.error('Failed to fetch parents'); } finally { setLoading(false); }
  };

  const filteredParents = parents.filter((p) => {
    const q = searchQuery.toLowerCase();
    const name = getFullName(p.userId).toLowerCase();
    return name.includes(q) || p.userId.email.toLowerCase().includes(q) || p.mobileNumber?.includes(q);
  });

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <EduplanCoachLayout user={user}>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Parents</h1>
            <p className="text-gray-600 mt-1">View parents of your students</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-gray-600 mb-1">Total Parents</p><p className="text-3xl font-bold text-gray-900">{parents.length}</p></div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <input type="text" placeholder="Search by name, email, or mobile..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 w-full md:w-1/3" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Parent</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mobile</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredParents.length > 0 ? filteredParents.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {p.userId.profilePicture ? (
                            <img src={`${BACKEND_URL}/uploads/${p.userId.profilePicture}`} alt="" className="w-10 h-10 rounded-full object-cover mr-3" />
                          ) : (
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-purple-600 font-semibold text-sm">{getInitials(p.userId)}</span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{getFullName(p.userId)}</div>
                            <div className="text-sm text-gray-500">{p.relationship}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.userId.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.mobileNumber || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {p.studentIds.map((s: any) => (
                            <span key={s._id} className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{getFullName(s.userId)}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${p.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {p.userId.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={() => router.push(`/eduplan-coach/parents/${p._id}`)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs">View Detail</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-6 py-12 text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <p className="text-lg font-medium text-gray-900 mb-1">No parents found</p>
                      <p className="text-sm text-gray-500">{searchQuery ? 'Try adjusting your search' : 'Parents will appear here once students are linked.'}</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </EduplanCoachLayout>
    </>
  );
}
