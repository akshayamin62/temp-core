'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, serviceAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

interface OPS {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  email: string;
  mobileNumber?: string;
  specializations?: string[];
}

interface IvyExpert {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  email: string;
  mobileNumber?: string;
}

interface EduplanCoach {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
  };
  email: string;
  mobileNumber?: string;
}

interface Registration {
  _id: string;
  serviceId: {
    _id: string;
    name: string;
    slug: string;
    shortDescription: string;
  };
  // OPS fields (for Study Abroad)
  primaryOpsId?: OPS;
  secondaryOpsId?: OPS;
  activeOpsId?: OPS;
  // Ivy Expert fields (for Ivy League Preparation)
  primaryIvyExpertId?: IvyExpert;
  secondaryIvyExpertId?: IvyExpert;
  activeIvyExpertId?: IvyExpert;
  // Eduplan Coach fields (for Education Planning)
  primaryEduplanCoachId?: EduplanCoach;
  secondaryEduplanCoachId?: EduplanCoach;
  activeEduplanCoachId?: EduplanCoach;
  status: string;
  createdAt: string;
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<OPS[]>([]);
  const [ivyExperts, setIvyExperts] = useState<IvyExpert[]>([]);
  const [eduplanCoaches, setEduplanCoaches] = useState<EduplanCoach[]>([]);
  const [assigningOps, setAssigningOps] = useState<string | null>(null);
  const [switchingActive, setSwitchingActive] = useState<string | null>(null);

  // Use ref to prevent double execution in React StrictMode
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch in React StrictMode (development only)
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN && userData.role !== USER_ROLE.OPS) {
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
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/super-admin/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setStudent(response.data.data.student);
      setRegistrations(response.data.data.registrations);
      
      // Fetch ops
      try {
        const opsResponse = await axios.get(`${API_URL}/super-admin/ops`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOps(opsResponse.data.data.ops || []);
      } catch (err) {
        console.error('Failed to fetch ops:', err);
        setOps([]);
      }
      
      // Fetch ivy experts
      try {
        const ivyExpertsResponse = await axios.get(`${API_URL}/super-admin/ivy-experts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIvyExperts(ivyExpertsResponse.data.data.ivyExperts || []);
      } catch (err) {
        console.error('Failed to fetch ivy experts:', err);
        setIvyExperts([]);
      }
      
      // Fetch eduplan coaches
      try {
        const eduplanCoachesResponse = await axios.get(`${API_URL}/super-admin/eduplan-coaches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEduplanCoaches(eduplanCoachesResponse.data.data.eduplanCoaches || []);
      } catch (err) {
        console.error('Failed to fetch eduplan coaches:', err);
        setEduplanCoaches([]);
      }
    } catch (error: any) {
      console.error('Fetch student details error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 403) {
        toast.error('Access denied. You are not the active OPS for this student.');
        router.push('/ops/students');
      } else {
        toast.error('Failed to fetch student details');
      }
      console.error('Fetch student details error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOps = async (
    registrationId: string, 
    primaryId: string, 
    secondaryId: string,
    serviceName: string
  ) => {
    if (!primaryId && !secondaryId) {
      toast.error('Please select at least one role');
      return;
    }

    setAssigningOps(registrationId);
    try {
      const token = localStorage.getItem('token');
      
      // Determine which field names to use based on service
      let payload: any = {};
      if (serviceName === 'Study Abroad') {
        payload = {
          primaryOpsId: primaryId || undefined,
          secondaryOpsId: secondaryId || undefined
        };
      } else if (serviceName === 'Ivy League Preparation') {
        payload = {
          primaryIvyExpertId: primaryId || undefined,
          secondaryIvyExpertId: secondaryId || undefined
        };
      } else if (serviceName === 'Education Planning') {
        payload = {
          primaryEduplanCoachId: primaryId || undefined,
          secondaryEduplanCoachId: secondaryId || undefined
        };
      }
      
      await axios.post(
        `${API_URL}/super-admin/students/registrations/${registrationId}/assign-ops`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Role assigned successfully');
      fetchStudentDetails(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign role');
      console.error('Assign role error:', error);
    } finally {
      setAssigningOps(null);
    }
  };

  const handleSwitchActiveOps = async (registrationId: string, roleId: string, serviceName: string) => {
    if (!roleId) {
      toast.error('Please select a role');
      return;
    }

    setSwitchingActive(registrationId);
    try {
      const token = localStorage.getItem('token');
      
      // Determine which field name to use based on service
      let payload: any = {};
      if (serviceName === 'Study Abroad') {
        payload = { activeOpsId: roleId };
      } else if (serviceName === 'Ivy League Preparation') {
        payload = { activeIvyExpertId: roleId };
      } else if (serviceName === 'Education Planning') {
        payload = { activeEduplanCoachId: roleId };
      }
      
      await axios.post(
        `${API_URL}/super-admin/students/registrations/${registrationId}/switch-active-ops`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Active OPS switched successfully');
      fetchStudentDetails(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to switch active OPS');
      console.error('Switch active OPS error:', error);
    } finally {
      setSwitchingActive(null);
    }
  };

  const handleViewFormData = (registrationId: string, serviceName?: string) => {
    // For Ivy League, open the student ivy-league view in read-only mode
    if (serviceName === 'Ivy League Preparation' && student?.userId?._id) {
      router.push(`/ivy-league/student?studentId=${student.userId._id}&readOnly=true`);
      return;
    }
    router.push(`/super-admin/roles/student/${studentId}/registration/${registrationId}`);
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
      <SuperAdminLayout user={user}>
        <div className="p-8 text-center">
          <p className="text-red-600">Student not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={user}>
        <div className="p-8">
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
                  {getFullName(student.adminId?.userId) || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Counselor</p>
                <p className="font-medium text-gray-900">
                  {getFullName(student.counselorId?.userId) || 'N/A'}
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
                        {user?.role === USER_ROLE.SUPER_ADMIN && (
                          <div className="mt-4 space-y-4 border-t pt-4">
                            {/* Service-specific role assignment */}
                            {registration.serviceId.name === 'Study Abroad' && (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Primary OPS */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Primary OPS
                                    </label>
                                    <select
                                      id={`primary-${registration._id}`}
                                      value={registration.primaryOpsId?._id || ''}
                                      onChange={(e) => {
                                        const secondarySelect = document.getElementById(`secondary-${registration._id}`) as HTMLSelectElement;
                                        handleAssignOps(registration._id, e.target.value, secondarySelect?.value || '', registration.serviceId.name);
                                      }}
                                      disabled={assigningOps === registration._id}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                                    >
                                      <option value="">Select Primary OPS</option>
                                      {ops.map((OPS) => (
                                        <option key={OPS._id} value={OPS._id}>
                                          {getFullName(OPS.userId) || OPS.email}
                                          {OPS.specializations && OPS.specializations.length > 0 && 
                                            ` (${OPS.specializations.join(', ')})`
                                          }
                                        </option>
                                      ))}
                                    </select>
                                    {registration.primaryOpsId && (
                                      <p className="mt-1 text-xs text-gray-600">
                                        {getFullName(registration.primaryOpsId.userId) || registration.primaryOpsId.email}
                                      </p>
                                    )}
                                  </div>

                                  {/* Secondary OPS */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Secondary OPS
                                    </label>
                                    <select
                                      id={`secondary-${registration._id}`}
                                      value={registration.secondaryOpsId?._id || ''}
                                      onChange={(e) => {
                                        const primarySelect = document.getElementById(`primary-${registration._id}`) as HTMLSelectElement;
                                        handleAssignOps(registration._id, primarySelect?.value || '', e.target.value, registration.serviceId.name);
                                      }}
                                      disabled={assigningOps === registration._id}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                                    >
                                      <option value="">Select Secondary OPS</option>
                                      {ops.map((OPS) => (
                                        <option key={OPS._id} value={OPS._id}>
                                          {getFullName(OPS.userId) || OPS.email}
                                          {OPS.specializations && OPS.specializations.length > 0 && 
                                            ` (${OPS.specializations.join(', ')})`
                                          }
                                        </option>
                                      ))}
                                    </select>
                                    {registration.secondaryOpsId && (
                                      <p className="mt-1 text-xs text-gray-600">
                                        {getFullName(registration.secondaryOpsId.userId) || registration.secondaryOpsId.email}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Active OPS Switcher */}
                                {(registration.primaryOpsId || registration.secondaryOpsId) && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <label className="block text-sm font-semibold text-blue-900 mb-2">
                                      Active OPS (Has Access)
                                    </label>
                                    <div className="flex items-center gap-3">
                                      <select
                                        value={registration.activeOpsId?._id || ''}
                                        onChange={(e) => handleSwitchActiveOps(registration._id, e.target.value, registration.serviceId.name)}
                                        disabled={switchingActive === registration._id}
                                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm font-medium"
                                      >
                                        <option value="">Select Active OPS</option>
                                        {registration.primaryOpsId && (
                                          <option value={registration.primaryOpsId._id}>
                                            Primary: {getFullName(registration.primaryOpsId.userId) || registration.primaryOpsId.email}
                                          </option>
                                        )}
                                        {registration.secondaryOpsId && (
                                          <option value={registration.secondaryOpsId._id}>
                                            Secondary: {getFullName(registration.secondaryOpsId.userId) || registration.secondaryOpsId.email}
                                          </option>
                                        )}
                                      </select>
                                      {switchingActive === registration._id && (
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </div>
                                    {registration.activeOpsId && (
                                      <div className="mt-2 flex items-center text-sm">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Active
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {getFullName(registration.activeOpsId.userId) || registration.activeOpsId.email}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {registration.serviceId.name === 'Ivy League Preparation' && (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Primary Ivy Expert */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Primary Ivy Expert
                                    </label>
                                    <select
                                      id={`primary-${registration._id}`}
                                      value={registration.primaryIvyExpertId?._id || ''}
                                      onChange={(e) => {
                                        const secondarySelect = document.getElementById(`secondary-${registration._id}`) as HTMLSelectElement;
                                        handleAssignOps(registration._id, e.target.value, secondarySelect?.value || '', registration.serviceId.name);
                                      }}
                                      disabled={assigningOps === registration._id}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-sm"
                                    >
                                      <option value="">Select Primary Ivy Expert</option>
                                      {ivyExperts.map((expert) => (
                                        <option key={expert._id} value={expert._id}>
                                          {getFullName(expert.userId) || expert.email}
                                        </option>
                                      ))}
                                    </select>
                                    {registration.primaryIvyExpertId && (
                                      <p className="mt-1 text-xs text-gray-600">
                                        {getFullName(registration.primaryIvyExpertId.userId) || registration.primaryIvyExpertId.email}
                                      </p>
                                    )}
                                  </div>

                                  {/* Secondary Ivy Expert */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Secondary Ivy Expert
                                    </label>
                                    <select
                                      id={`secondary-${registration._id}`}
                                      value={registration.secondaryIvyExpertId?._id || ''}
                                      onChange={(e) => {
                                        const primarySelect = document.getElementById(`primary-${registration._id}`) as HTMLSelectElement;
                                        handleAssignOps(registration._id, primarySelect?.value || '', e.target.value, registration.serviceId.name);
                                      }}
                                      disabled={assigningOps === registration._id}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-sm"
                                    >
                                      <option value="">Select Secondary Ivy Expert</option>
                                      {ivyExperts.map((expert) => (
                                        <option key={expert._id} value={expert._id}>
                                          {getFullName(expert.userId) || expert.email}
                                        </option>
                                      ))}
                                    </select>
                                    {registration.secondaryIvyExpertId && (
                                      <p className="mt-1 text-xs text-gray-600">
                                        {getFullName(registration.secondaryIvyExpertId.userId) || registration.secondaryIvyExpertId.email}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Active Ivy Expert Switcher */}
                                {(registration.primaryIvyExpertId || registration.secondaryIvyExpertId) && (
                                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <label className="block text-sm font-semibold text-purple-900 mb-2">
                                      Active Ivy Expert (Has Access)
                                    </label>
                                    <div className="flex items-center gap-3">
                                      <select
                                        value={registration.activeIvyExpertId?._id || ''}
                                        onChange={(e) => handleSwitchActiveOps(registration._id, e.target.value, registration.serviceId.name)}
                                        disabled={switchingActive === registration._id}
                                        className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 text-sm font-medium"
                                      >
                                        <option value="">Select Active Ivy Expert</option>
                                        {registration.primaryIvyExpertId && (
                                          <option value={registration.primaryIvyExpertId._id}>
                                            Primary: {getFullName(registration.primaryIvyExpertId.userId) || registration.primaryIvyExpertId.email}
                                          </option>
                                        )}
                                        {registration.secondaryIvyExpertId && (
                                          <option value={registration.secondaryIvyExpertId._id}>
                                            Secondary: {getFullName(registration.secondaryIvyExpertId.userId) || registration.secondaryIvyExpertId.email}
                                          </option>
                                        )}
                                      </select>
                                      {switchingActive === registration._id && (
                                        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </div>
                                    {registration.activeIvyExpertId && (
                                      <div className="mt-2 flex items-center text-sm">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Active
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {getFullName(registration.activeIvyExpertId.userId) || registration.activeIvyExpertId.email}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {registration.serviceId.name === 'Education Planning' && (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Primary Eduplan Coach */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Primary Eduplan Coach
                                    </label>
                                    <select
                                      id={`primary-${registration._id}`}
                                      value={registration.primaryEduplanCoachId?._id || ''}
                                      onChange={(e) => {
                                        const secondarySelect = document.getElementById(`secondary-${registration._id}`) as HTMLSelectElement;
                                        handleAssignOps(registration._id, e.target.value, secondarySelect?.value || '', registration.serviceId.name);
                                      }}
                                      disabled={assigningOps === registration._id}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 text-sm"
                                    >
                                      <option value="">Select Primary Eduplan Coach</option>
                                      {eduplanCoaches.map((coach) => (
                                        <option key={coach._id} value={coach._id}>
                                          {getFullName(coach.userId) || coach.email}
                                        </option>
                                      ))}
                                    </select>
                                    {registration.primaryEduplanCoachId && (
                                      <p className="mt-1 text-xs text-gray-600">
                                        {getFullName(registration.primaryEduplanCoachId.userId) || registration.primaryEduplanCoachId.email}
                                      </p>
                                    )}
                                  </div>

                                  {/* Secondary Eduplan Coach */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Secondary Eduplan Coach
                                    </label>
                                    <select
                                      id={`secondary-${registration._id}`}
                                      value={registration.secondaryEduplanCoachId?._id || ''}
                                      onChange={(e) => {
                                        const primarySelect = document.getElementById(`primary-${registration._id}`) as HTMLSelectElement;
                                        handleAssignOps(registration._id, primarySelect?.value || '', e.target.value, registration.serviceId.name);
                                      }}
                                      disabled={assigningOps === registration._id}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 text-sm"
                                    >
                                      <option value="">Select Secondary Eduplan Coach</option>
                                      {eduplanCoaches.map((coach) => (
                                        <option key={coach._id} value={coach._id}>
                                          {getFullName(coach.userId) || coach.email}
                                        </option>
                                      ))}
                                    </select>
                                    {registration.secondaryEduplanCoachId && (
                                      <p className="mt-1 text-xs text-gray-600">
                                        {getFullName(registration.secondaryEduplanCoachId.userId) || registration.secondaryEduplanCoachId.email}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Active Eduplan Coach Switcher */}
                                {(registration.primaryEduplanCoachId || registration.secondaryEduplanCoachId) && (
                                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                                    <label className="block text-sm font-semibold text-teal-900 mb-2">
                                      Active Eduplan Coach (Has Access)
                                    </label>
                                    <div className="flex items-center gap-3">
                                      <select
                                        value={registration.activeEduplanCoachId?._id || ''}
                                        onChange={(e) => handleSwitchActiveOps(registration._id, e.target.value, registration.serviceId.name)}
                                        disabled={switchingActive === registration._id}
                                        className="flex-1 px-3 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900 text-sm font-medium"
                                      >
                                        <option value="">Select Active Eduplan Coach</option>
                                        {registration.primaryEduplanCoachId && (
                                          <option value={registration.primaryEduplanCoachId._id}>
                                            Primary: {getFullName(registration.primaryEduplanCoachId.userId) || registration.primaryEduplanCoachId.email}
                                          </option>
                                        )}
                                        {registration.secondaryEduplanCoachId && (
                                          <option value={registration.secondaryEduplanCoachId._id}>
                                            Secondary: {getFullName(registration.secondaryEduplanCoachId.userId) || registration.secondaryEduplanCoachId.email}
                                          </option>
                                        )}
                                      </select>
                                      {switchingActive === registration._id && (
                                        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                                      )}
                                    </div>
                                    {registration.activeEduplanCoachId && (
                                      <div className="mt-2 flex items-center text-sm">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          Active
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {getFullName(registration.activeEduplanCoachId.userId) || registration.activeEduplanCoachId.email}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}

                            {assigningOps === registration._id && (
                              <div className="flex items-center justify-center py-2">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span className="text-sm text-gray-600">Updating assignment...</span>
                              </div>
                            )}
                          </div>
                        )}
                        {user?.role === USER_ROLE.OPS && (
                          <div className="mt-3 space-y-2">
                            {/* Study Abroad - OPS */}
                            {registration.serviceId.name === 'Study Abroad' && (registration.primaryOpsId || registration.secondaryOpsId) && (
                              <>
                                {registration.primaryOpsId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Primary OPS:</span> {getFullName(registration.primaryOpsId.userId) || registration.primaryOpsId.email}
                                  </p>
                                )}
                                {registration.secondaryOpsId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Secondary OPS:</span> {getFullName(registration.secondaryOpsId.userId) || registration.secondaryOpsId.email}
                                  </p>
                                )}
                                {registration.activeOpsId && (
                                  <p className="text-xs font-medium text-green-600">
                                    Active: {getFullName(registration.activeOpsId.userId) || registration.activeOpsId.email}
                                  </p>
                                )}
                              </>
                            )}
                            {/* Ivy League Preparation - Ivy Expert */}
                            {registration.serviceId.name === 'Ivy League Preparation' && (registration.primaryIvyExpertId || registration.secondaryIvyExpertId) && (
                              <>
                                {registration.primaryIvyExpertId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Primary Ivy Expert:</span> {getFullName(registration.primaryIvyExpertId.userId) || registration.primaryIvyExpertId.email}
                                  </p>
                                )}
                                {registration.secondaryIvyExpertId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Secondary Ivy Expert:</span> {getFullName(registration.secondaryIvyExpertId.userId) || registration.secondaryIvyExpertId.email}
                                  </p>
                                )}
                                {registration.activeIvyExpertId && (
                                  <p className="text-xs font-medium text-green-600">
                                    Active: {getFullName(registration.activeIvyExpertId.userId) || registration.activeIvyExpertId.email}
                                  </p>
                                )}
                              </>
                            )}
                            {/* Education Planning - Eduplan Coach */}
                            {registration.serviceId.name === 'Education Planning' && (registration.primaryEduplanCoachId || registration.secondaryEduplanCoachId) && (
                              <>
                                {registration.primaryEduplanCoachId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Primary Eduplan Coach:</span> {getFullName(registration.primaryEduplanCoachId.userId) || registration.primaryEduplanCoachId.email}
                                  </p>
                                )}
                                {registration.secondaryEduplanCoachId && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Secondary Eduplan Coach:</span> {getFullName(registration.secondaryEduplanCoachId.userId) || registration.secondaryEduplanCoachId.email}
                                  </p>
                                )}
                                {registration.activeEduplanCoachId && (
                                  <p className="text-xs font-medium text-green-600">
                                    Active: {getFullName(registration.activeEduplanCoachId.userId) || registration.activeEduplanCoachId.email}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewFormData(registration._id, registration.serviceId.name)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View/Edit Form
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
      </SuperAdminLayout>
    </>
  );
}
