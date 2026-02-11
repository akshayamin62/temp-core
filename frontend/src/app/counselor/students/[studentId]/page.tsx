'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, adminStudentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';

interface StudentDetails {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  adminId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  counselorId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  createdAt: string;
}

interface Registration {
  _id: string;
  serviceId: {
    _id: string;
    name: string;
    slug: string;
    shortDescription: string;
  };
  primaryOpsId?: {
    _id: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  secondaryOpsId?: {
    _id: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  activeOpsId?: {
    _id: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  status: string;
  createdAt: string;
}

export default function CounselorStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
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

      if (userData.role !== USER_ROLE.COUNSELOR) {
        toast.error('Access denied. Counselor only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudent();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudent = async () => {
    try {
      const response = await adminStudentAPI.getStudentDetails(studentId);
      setStudent(response.data.data.student);
      setRegistrations(response.data.data.registrations);
    } catch (error: any) {
      console.error('Error fetching student:', error);
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error('Student not found or access denied');
        router.push('/counselor/students');
      } else {
        toast.error('Failed to fetch student details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  const getRegistrationStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'REGISTERED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewFormData = (registrationId: string) => {
    router.push(`/counselor/students/${studentId}/registration/${registrationId}`);
  };

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/counselor/students')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Students
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : student ? (
            <>
              {/* Header */}
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">{getFullName(student.userId)}</h1>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(student.userId.isActive)}`}>
                      {student.userId.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">Student Details</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm font-medium">Read-only access</span>
                </div>
              </div>

              {/* Student Info Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold text-xl">
                        {getInitials(student.userId)}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{getFullName(student.userId)}</h1>
                      <p className="text-gray-600">{student.userId.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        student.userId.isVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {student.userId.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        student.userId.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.userId.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Mobile Number</p>
                    <p className="font-medium text-gray-900">
                      {student.mobileNumber || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Admin</p>
                    <p className="font-medium text-gray-900">
                      {getFullName(student.adminId?.userId) || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Counselor</p>
                    <p className="font-medium text-gray-900">
                      {getFullName(student.counselorId?.userId) || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Joined Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Registrations */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Registrations</h2>
                
                {registrations && registrations.length > 0 ? (
                  <div className="space-y-4">
                    {registrations.map((registration) => (
                      <div key={registration._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {registration.serviceId.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {registration.serviceId.shortDescription}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Registered: {new Date(registration.createdAt).toLocaleDateString()}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {registration.status}
                              </span>
                            </div>
                            
                            {/* OPS Info (Read-only) */}
                            {(registration.primaryOpsId || registration.secondaryOpsId) && (
                              <div className="mt-3 space-y-2">
                                {registration.primaryOpsId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Primary OPS:</span> {getFullName(registration.primaryOpsId.userId) || 'N/A'}
                                  </p>
                                )}
                                {registration.secondaryOpsId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Secondary OPS:</span> {getFullName(registration.secondaryOpsId.userId) || 'N/A'}
                                  </p>
                                )}
                                {registration.activeOpsId && (
                                  <p className="text-xs font-medium text-blue-600">
                                    ✓ Active: {getFullName(registration.activeOpsId.userId) || 'N/A'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleViewFormData(registration._id)}
                            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Form Data
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">No service registrations found</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Student not found</p>
            </div>
          )}
        </div>
    </>
  );
}
