'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { parentAPI } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import { BACKEND_URL } from '@/lib/ivyApi';

interface ParentDetail {
  _id: string;
  userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string; profilePicture?: string; isActive: boolean; isVerified?: boolean; createdAt: string };
  studentIds: { _id: string; userId: { _id: string; firstName?: string; middleName?: string; lastName?: string; email: string } }[];
  email: string;
  relationship: string;
  mobileNumber: string;
  qualification: string;
  occupation: string;
  createdAt: string;
}

export default function IvyExpertParentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const parentId = params.parentId as string;
  const [parent, setParent] = useState<ParentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParent();
  }, [parentId]);

  const fetchParent = async () => {
    try {
      const response = await parentAPI.getParentDetail(parentId);
      setParent(response.data.data.parent);
    } catch { toast.error('Failed to fetch parent details'); } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
    </div>
  );

  if (!parent) return (
    <div className="p-8">
      <p className="text-gray-600 mb-4">Parent not found.</p>
      <button onClick={() => router.back()} className="text-blue-600 hover:underline">Go Back</button>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-8">
        <button onClick={() => router.back()} className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Parents
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-6">
            {parent.userId.profilePicture ? (
              <img src={`${BACKEND_URL}/uploads/${parent.userId.profilePicture}`} alt="" className="w-16 h-16 rounded-full object-cover mr-4" />
            ) : (
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-purple-600 font-bold text-xl">{getInitials(parent.userId)}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getFullName(parent.userId)}</h1>
              <p className="text-gray-600">{parent.userId.email}</p>
              <div className="flex gap-2 mt-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${parent.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {parent.userId.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div><p className="text-sm text-gray-600 mb-1">Relationship</p><p className="font-medium text-gray-900">{parent.relationship || '-'}</p></div>
              <div><p className="text-sm text-gray-600 mb-1">Mobile</p><p className="font-medium text-gray-900">{parent.mobileNumber || '-'}</p></div>
              <div><p className="text-sm text-gray-600 mb-1">Email</p><p className="font-medium text-gray-900">{parent.email || parent.userId.email}</p></div>
              <div><p className="text-sm text-gray-600 mb-1">Qualification</p><p className="font-medium text-gray-900">{parent.qualification || '-'}</p></div>
              <div><p className="text-sm text-gray-600 mb-1">Occupation</p><p className="font-medium text-gray-900">{parent.occupation || '-'}</p></div>
              <div><p className="text-sm text-gray-600 mb-1">Joined</p><p className="font-medium text-gray-900">{new Date(parent.userId.createdAt).toLocaleDateString()}</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Students ({parent.studentIds.length})</h2>
          {parent.studentIds.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {parent.studentIds.map((s: any) => (
                <div key={s._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold text-sm">{getInitials(s.userId)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getFullName(s.userId)}</p>
                      <p className="text-sm text-gray-500">{s.userId.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/ivy-league/ivy-expert/${s._id}`)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                  >
                    View Detail
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No students linked.</p>
          )}
        </div>
      </div>
    </>
  );
}
