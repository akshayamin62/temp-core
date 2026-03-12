'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, parentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import ParentLayout from '@/components/ParentLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';

interface StudentData {
  _id: string;
  user: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  intake?: string;
  year?: string;
  registrationCount: number;
  createdAt: string;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
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

      if (userData.role !== USER_ROLE.PARENT) {
        toast.error('Access denied. Parent only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudents();
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await parentAPI.getMyStudents();
      setStudents(response.data.data.students);
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <ParentLayout user={user}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.firstName}</h1>
            <p className="text-gray-600 mt-1">View your children&apos;s academic progress</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Children</p>
                  <p className="text-3xl font-bold text-gray-900">{students.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {students.reduce((sum, s) => sum + s.registrationCount, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Children</h2>
          </div>

          {students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => (
                <div
                  key={student._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold text-lg">
                          {getInitials(student.user)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getFullName(student.user)}
                        </h3>
                        <p className="text-sm text-gray-500">{student.user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Services</span>
                        <span className="font-medium text-gray-900">{student.registrationCount}</span>
                      </div>
                      {student.intake && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Intake</span>
                          <span className="font-medium text-blue-600">{student.intake}</span>
                        </div>
                      )}
                      {student.year && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Year</span>
                          <span className="font-medium text-blue-600">{student.year}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Joined</span>
                        <span className="font-medium text-gray-900">
                          {new Date(student.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/parent/students/${student._id}`)}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm inline-flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-1">No students linked</p>
              <p className="text-sm text-gray-500">Your children will appear here once they are registered.</p>
            </div>
          )}
        </div>
      </ParentLayout>
    </>
  );
}
