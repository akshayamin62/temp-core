'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { IVY_API_URL } from '@/lib/ivyApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentService {
  _id: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: string;
  createdAt: string;
}

interface IvyExpertUser {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
}

export default function IvyExpertStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [ivyExpertUser, setIvyExpertUser] = useState<IvyExpertUser | null>(null);
  const [students, setStudents] = useState<StudentService[]>([]);
  const [ivyExpertId, setIvyExpertId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchData();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch ivy expert user info
      try {
        const userResponse = await axios.get(`${API_URL}/super-admin/users`, {
          headers,
          params: { search: '', role: 'ivy-expert' },
        });
        const users = userResponse.data.data.users || [];
        const found = users.find((u: any) => (u._id || u.id) === userId);
        if (found) {
          setIvyExpertUser(found);
        }
      } catch (err) {
        console.error('Failed to fetch ivy expert user info:', err);
      }

      // Fetch students assigned to this ivy expert
      const studentsResponse = await axios.get(
        `${IVY_API_URL}/ivy-service/user/${userId}/students`,
        { headers }
      );

      setStudents(studentsResponse.data.data || []);
      setIvyExpertId(studentsResponse.data.ivyExpertId || '');
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (service: StudentService) => {
    const queryParams = new URLSearchParams({
      studentId: service.studentId._id,
      studentIvyServiceId: service._id,
      ...(ivyExpertId ? { ivyExpertId } : {}),
    });
    router.push(`/ivy-league/ivy-expert?${queryParams.toString()}`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const expertName = ivyExpertUser
    ? `${ivyExpertUser.firstName}${ivyExpertUser.middleName ? ' ' + ivyExpertUser.middleName : ''} ${ivyExpertUser.lastName}`
    : 'Ivy Expert';

  return (
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/super-admin/roles/ivy-expert')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Ivy Experts
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Students Assigned to {expertName}
          </h1>
          {ivyExpertUser?.email && (
            <p className="text-gray-500 mt-1">{ivyExpertUser.email}</p>
          )}
          <p className="text-gray-400 text-sm mt-1">
            {students.length} student{students.length !== 1 ? 's' : ''} assigned
          </p>
        </div>

        {/* Student List */}
        <div className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {students.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-500">
                No students assigned to this Ivy Expert yet.
              </li>
            ) : (
              students.map((service) => (
                <li key={service._id}>
                  <button
                    onClick={() => handleStudentClick(service)}
                    className="w-full text-left block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-6 py-5 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                            {service.studentId.firstName
                              ? service.studentId.firstName.charAt(0).toUpperCase()
                              : '?'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-base font-semibold text-gray-900">
                            {service.studentId.firstName
                              ? `${service.studentId.firstName} ${service.studentId.lastName}`
                              : 'Unknown Student'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {service.studentId.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            service.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {service.status}
                        </span>
                        <svg
                          className="h-5 w-5 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
