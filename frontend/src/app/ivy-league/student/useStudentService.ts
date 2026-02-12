'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

interface StudentServiceData {
  studentId: string;
  studentIvyServiceId: string;
  loading: boolean;
  error: string | null;
  readOnly: boolean;
}

/**
 * Hook to resolve studentId and studentIvyServiceId.
 *
 * Normal flow (STUDENT role):
 *   Calls GET /api/ivy/ivy-service/my-service and extracts IDs from auth.
 *
 * Super-admin read-only flow:
 *   When URL has ?studentId=<userId>&readOnly=true, calls
 *   GET /api/ivy/ivy-service/student/<userId> instead.
 *   Returns readOnly = true so pages can disable editing.
 */
export function useStudentService(): StudentServiceData {
  const searchParams = useSearchParams();
  const urlStudentId = searchParams.get('studentId');
  const urlReadOnly = searchParams.get('readOnly') === 'true';

  const [studentId, setStudentId] = useState<string>('');
  const [studentIvyServiceId, setStudentIvyServiceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);

        let svc: any = null;

        if (urlStudentId) {
          // Super-admin flow: fetch by student's User._id
          const res = await axios.get(`${IVY_API_URL}/ivy-service/student/${urlStudentId}`);
          if (res.data.success && res.data.data) {
            svc = res.data.data;
          }
        } else {
          // Normal student flow: auth-based
          const res = await axios.get(`${IVY_API_URL}/ivy-service/my-service`);
          if (res.data.success && res.data.data) {
            svc = res.data.data;
          }
        }

        if (svc) {
          setStudentId(svc.studentId?._id || '');
          setStudentIvyServiceId(svc._id || '');
        } else {
          setError('No Ivy service found.');
        }
      } catch (err: any) {
        console.error('Error fetching student service:', err);
        setError(err.response?.data?.message || 'Failed to load service data');
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [urlStudentId]);

  return { studentId, studentIvyServiceId, loading, error, readOnly: urlReadOnly };
}
