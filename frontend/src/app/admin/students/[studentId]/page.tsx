'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, adminStudentAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
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
    companyName?: string;
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

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

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

      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchStudentDetails();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchStudentDetails = async () => {
    try {
      const response = await adminStudentAPI.getStudentDetails(studentId);
      setStudent(response.data.data.student);
      setRegistrations(response.data.data.registrations);
    } catch (error: any) {
      console.error('Fetch student details error:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. This student does not belong to your admin.');
        router.push('/admin/students');
      } else {
        toast.error('Failed to fetch student details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewFormData = (registrationId: string) => {
    router.push(`/admin/students/${studentId}/registration/${registrationId}`);
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

  if (!student) {
    return (
      <AdminLayout user={user}>
        <div className="p-8 text-center">
          <p className="text-red-600">Student not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-green-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-8">
          {/* Read-only Badge */}
          <div className="mb-4 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 w-fit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-medium">Read-only access</span>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Students
          </button>

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
                  {student.adminId?.companyName || 'N/A'}
                </p>
                {student.adminId?.userId?.email && (
                  <p className="text-sm text-gray-500">{student.adminId.userId.email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Counselor</p>
                <p className="font-medium text-green-600">
                  {getFullName(student.counselorId?.userId) || 'N/A'}
                </p>
                {student.counselorId?.userId?.email && (
                  <p className="text-sm text-gray-500">{student.counselorId.userId.email}</p>
                )}
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Service Registrations ({registrations.length})
            </h2>

            {registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.map((registration) => (
                  <div
                    key={registration._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
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
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-gray-500">No service registrations yet</p>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
