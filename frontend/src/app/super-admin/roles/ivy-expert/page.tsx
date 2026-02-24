'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function IvyExpertUsersPage() {
  const router = useRouter();
  const [ivyStats, setIvyStats] = useState({ candidates: 0, students: 0 });

  useEffect(() => {
    const fetchIvyStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/super-admin/ivy-league/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setIvyStats({ candidates: res.data.candidates, students: res.data.students });
        }
      } catch {
        // ignore
      }
    };
    fetchIvyStats();
  }, []);

  return (
    <RoleUserListPage
      role="ivy-expert"
      roleDisplayName="Ivy Expert"
      roleEnum={USER_ROLE.IVY_EXPERT}
      canAddUser={true}
      hideActiveUsers={true}
      extraStats={
        <>
          <div
            onClick={() => router.push('/super-admin/roles/ivy-expert/candidates')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ivy Candidates</p>
                <p className="text-3xl font-bold text-gray-900">{ivyStats.candidates}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div
            onClick={() => router.push('/super-admin/roles/ivy-expert/students')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-green-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ivy Students</p>
                <p className="text-3xl font-bold text-gray-900">{ivyStats.students}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </>
      }
      headerExtra={
        <div className="flex items-center gap-3">
          <Link
            href="/super-admin/roles/ivy-expert/activities"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Manage Activities
          </Link>
          <Link
            href="/super-admin/roles/ivy-expert/manage-test"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Manage Test
          </Link>
        </div>
      }
    />
  );
}
