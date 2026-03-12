'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ComingSoon from '@/components/ComingSoon';
import StudentLayout from '@/components/StudentLayout';

export default function StudentParentsPage() {
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
    <StudentLayout
      formStructure={[]}
      currentPartIndex={0}
      currentSectionIndex={0}
      onPartChange={() => {}}
      onSectionChange={() => {}}
      isOuterNav={true}
      serviceName="Study Abroad"
      user={user}
    >
      <div className="p-8">
        <ComingSoon title="Parents" />
      </div>
    </StudentLayout>
  );
}
