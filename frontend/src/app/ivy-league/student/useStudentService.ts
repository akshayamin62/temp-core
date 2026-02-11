'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

interface StudentServiceData {
  studentId: string;
  studentIvyServiceId: string;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to resolve studentId and studentIvyServiceId from auth (JWT).
 * Calls GET /api/ivy/ivy-service/my-service and extracts IDs.
 * Used by all ivy-league student sub-pages instead of reading from URL params.
 */
export function useStudentService(): StudentServiceData {
  const [studentId, setStudentId] = useState<string>('');
  const [studentIvyServiceId, setStudentIvyServiceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${IVY_API_URL}/ivy-service/my-service`);
        if (res.data.success && res.data.data) {
          const svc = res.data.data;
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
  }, []);

  return { studentId, studentIvyServiceId, loading, error };
}
