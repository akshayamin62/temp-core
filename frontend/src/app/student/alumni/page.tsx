'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ComingSoon from '@/components/ComingSoon';

export default function StudentAlumniPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    authAPI.getProfile().then(res => {
      const u = res.data.data.user;
      if (u.role !== USER_ROLE.STUDENT) { router.push('/student/registration'); return; }
      setUser(u);
      setLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="spinner mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div>
    </div>
  );

  return (
    <div className="p-8">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Return to Dashboard
      </button>
      <ComingSoon title="Alumni" />
    </div>
  );
}
