'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParentStudentsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/parent/dashboard');
  }, [router]);
  return null;
}
