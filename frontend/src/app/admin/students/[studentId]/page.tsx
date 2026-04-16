'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, adminStudentAPI, adminAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import StudentProfileModal from '@/components/StudentProfileModal';
import AuthImage from '@/components/AuthImage';

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
    profilePicture?: string;
    role: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  mobileNumber?: string;
  adminId?: {
    _id: string;
    companyName?: string;
    mobileNumber?: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    profilePicture?: string;
    };
  };
  counselorId?: {
    _id: string;
    mobileNumber?: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    profilePicture?: string;
    };
  };
  advisorId?: {
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
  intake?: string;
  year?: string;
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
    mobileNumber?: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  secondaryOpsId?: {
    _id: string;
    mobileNumber?: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  activeOpsId?: {
    _id: string;
    mobileNumber?: string;
    userId: { _id: string; firstName: string; middleName?: string; lastName: string; email: string };
  };
  planTier?: 'PRO' | 'PREMIUM' | 'PLATINUM';
  status: string;
  createdAt: string;
  // Payment fields
  paymentAmount?: number;
  totalAmount?: number;
  discountedAmount?: number;
  totalPaid?: number;
  paymentComplete?: boolean;
  paymentStatus?: string;
  paymentModel?: string;
  registeredViaAdvisorId?: {
    _id: string;
    companyName?: string;
    userId?: { firstName?: string; middleName?: string; lastName?: string };
  };
  registeredViaAdminId?: {
    _id: string;
    companyName?: string;
    userId?: { firstName?: string; middleName?: string; lastName?: string };
  };
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [transferInterestedServices, setTransferInterestedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [assigningCounselor, setAssigningCounselor] = useState(false);

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
      fetchCounselors();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchCounselors = async () => {
    try {
      const response = await adminAPI.getCounselors();
      setCounselors(response.data.data?.counselors || []);
    } catch (error) {
      console.error('Failed to fetch counselors:', error);
    }
  };

  const handleAssignCounselor = async (counselorId: string | null) => {
    try {
      setAssigningCounselor(true);
      await adminStudentAPI.assignCounselor(studentId, counselorId);
      toast.success(counselorId ? 'Counselor assigned' : 'Counselor removed');
      fetchStudentDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign counselor');
    } finally {
      setAssigningCounselor(false);
    }
  };

  const fetchStudentDetails = async () => {
    try {
      const response = await adminStudentAPI.getStudentDetails(studentId);
      setStudent(response.data.data.student);
      const regs = response.data.data.registrations;
      setRegistrations(regs);
      setTransferInterestedServices(response.data.data.transferInterestedServices || []);
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

  const handleViewFormData = (registrationId: string, serviceName?: string) => {
    // For Ivy League, open the student ivy-league view in read-only mode
    if (serviceName === 'Ivy League Preparation' && student?.userId?._id) {
      router.push(`/ivy-league/student?studentId=${student.userId._id}&readOnly=true`);
      return;
    }
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
                <AuthImage
                  path={student.userId.profilePicture}
                  alt={getFullName(student.userId)}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                  fallback={
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-bold text-xl">
                        {getInitials(student.userId)}
                      </span>
                    </div>
                  }
                />
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
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  View Profile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600 mb-1">Mobile Number</p>
                <p className="font-medium text-gray-900">
                  {student.mobileNumber || 'Not provided'}
                </p>
              </div>
              {student.adminId && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Admin</p>
                <p className="font-medium text-gray-900">
                  {student.adminId?.companyName || 'N/A'}
                </p>
                {student.adminId?.userId?.email && (
                  <p className="text-sm text-gray-500">{student.adminId.userId.email}</p>
                )}
                {student.adminId?.mobileNumber && (
                  <p className="text-sm text-gray-500">{student.adminId.mobileNumber}</p>
                )}
              </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Counselor</p>
                <select
                  value={student.counselorId?._id || ''}
                  onChange={(e) => handleAssignCounselor(e.target.value || null)}
                  disabled={assigningCounselor}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">Not Assigned</option>
                  {counselors.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {getFullName(c.userId) || c.userId?.email || 'Counselor'}
                    </option>
                  ))}
                </select>
              </div>
              {student.advisorId && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Advisor</p>
                <p className="font-medium text-gray-900">
                  {student.advisorId?.companyName || 'N/A'}
                </p>
                {student.advisorId?.userId?.email && (
                  <p className="text-sm text-gray-500">{student.advisorId.userId.email}</p>
                )}
              </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Joined Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(student.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            {/* Source / Intake / Year / Transfer */}
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-gray-200 mt-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Source</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${(student as any).referrerId ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                  {(student as any).referrerId ? 'Referral' : 'Enquiry Form'}
                </span>
              </div>
              {student.intake && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Intake</p>
                  <p className="font-medium text-blue-600">{student.intake}</p>
                </div>
              )}
              {student.year && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Year</p>
                  <p className="font-medium text-blue-600">{student.year}</p>
                </div>
              )}
              {student.advisorId && transferInterestedServices.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Transfer For</p>
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                    {transferInterestedServices.map(s => ({ 'study-abroad': 'Study Abroad', 'ivy-league': 'Ivy League', 'education-planning': 'Education Planning', 'coaching-classes': 'Coaching Classes' }[s] || s)).join(', ')}
                  </span>
                </div>
              )}
              {(student as any).referrerId && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Referred By</p>
                  <p className="font-medium text-purple-700">
                    {[(student as any).referrerId?.userId?.firstName, (student as any).referrerId?.userId?.middleName, (student as any).referrerId?.userId?.lastName].filter(Boolean).join(' ') || 'Referrer'}
                  </p>
                </div>
              )}
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
                          {registration.planTier && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              {registration.planTier}
                            </span>
                          )}
                        </h3>
                        {registration.registeredViaAdvisorId && (
                          <p className="text-xs text-blue-600 mb-1">
                            Via Advisor: {registration.registeredViaAdvisorId.companyName || [registration.registeredViaAdvisorId.userId?.firstName, registration.registeredViaAdvisorId.userId?.middleName, registration.registeredViaAdvisorId.userId?.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                        {registration.registeredViaAdminId && (
                          <p className="text-xs text-indigo-600 mb-1">
                            Via Admin: {registration.registeredViaAdminId.companyName || [registration.registeredViaAdminId.userId?.firstName, registration.registeredViaAdminId.userId?.middleName, registration.registeredViaAdminId.userId?.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mb-2">
                          {registration.serviceId.shortDescription}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Registered: {new Date(registration.createdAt).toLocaleDateString('en-GB')}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {registration.status}
                          </span>
                        </div>
                        
                        {/* OPS Info (Read-only) */}
                        {(registration.primaryOpsId || registration.secondaryOpsId) && (
                          <div className="mt-3 space-y-1">
                            {registration.primaryOpsId && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Primary OPS:</span>{' '}
                                {getFullName(registration.primaryOpsId.userId) || 'N/A'}
                                {registration.primaryOpsId.userId?.email && (
                                  <span className="text-gray-500"> • {registration.primaryOpsId.userId.email}</span>
                                )}
                                {registration.primaryOpsId.mobileNumber && (
                                  <span className="text-gray-500"> • {registration.primaryOpsId.mobileNumber}</span>
                                )}
                              </p>
                            )}
                            {registration.secondaryOpsId && (
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Secondary OPS:</span>{' '}
                                {getFullName(registration.secondaryOpsId.userId) || 'N/A'}
                                {registration.secondaryOpsId.userId?.email && (
                                  <span className="text-gray-500"> • {registration.secondaryOpsId.userId.email}</span>
                                )}
                                {registration.secondaryOpsId.mobileNumber && (
                                  <span className="text-gray-500"> • {registration.secondaryOpsId.mobileNumber}</span>
                                )}
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
                        onClick={() => handleViewFormData(registration._id, registration.serviceId.name)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </div>

                    {/* ====== Pricing & Discount Section ====== */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
                        {/* Original price */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Original Price:</span>
                          <span className={`text-sm font-medium ${registration.discountedAmount != null ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {(registration.totalAmount || registration.paymentAmount) ? `₹${(registration.totalAmount || registration.paymentAmount)!.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>

                        {/* After discount */}
                        {registration.discountedAmount != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">After Discount:</span>
                            <span className="text-sm font-bold text-green-700">
                              ₹{registration.discountedAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}

                        {/* Payment status */}
                        {registration.paymentStatus && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            registration.paymentComplete ? 'bg-green-100 text-green-800' :
                            registration.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {registration.paymentComplete ? 'Fully Paid' : registration.paymentStatus}
                          </span>
                        )}
                      </div>
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

          {/* Ivy League Candidate Profile */}
          {student && student.userId?._id && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/ivy-league/candidate-profile?userId=${student.userId._id}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                View Ivy League Candidate Profile
              </button>
              <button
                onClick={() => router.push(`/admin/students/${studentId}/enquiries`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Student Service Enquiry
              </button>
              {(student.adminId?._id || student.advisorId?._id) && (
                <button
                  onClick={() => router.push('/service-plans/view?studentId=' + studentId)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Service Plans
                </button>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
      {showProfileModal && (
        <StudentProfileModal studentId={studentId} onClose={() => setShowProfileModal(false)} viewerRole="ADMIN" />
      )}
    </>
  );
}