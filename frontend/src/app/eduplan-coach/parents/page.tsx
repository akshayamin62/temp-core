'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import EduplanCoachLayout from '@/components/EduplanCoachLayout';
import ComingSoon from '@/components/ComingSoon';

export default function EduplanCoachParentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    authAPI.getProfile().then(res => {
      const u = res.data.data.user;
      if (u.role !== USER_ROLE.EDUPLAN_COACH) { router.push('/login'); return; }
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
    <EduplanCoachLayout user={user}>
      <div className="p-8">
        <ComingSoon title="Parents" />
      </div>
    </EduplanCoachLayout>
  );
}
