'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, advisoryAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdvisoryLayout from '@/components/AdvisoryLayout';
import StudentProfileModal from '@/components/StudentProfileModal';
import AuthImage from '@/components/AuthImage';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import toast, { Toaster } from 'react-hot-toast';

interface StudentDetail {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
    profilePicture?: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt?: string;
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
    };
  };
  advisoryId?: {
    _id: string;
    userId: {
      _id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  convertedFromLeadId?: string;
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
    shortDescription?: string;
  };
  planTier?: 'PRO' | 'PREMIUM' | 'PLATINUM';
  status: string;
  createdAt: string;
}

interface Transfer {
  _id: string;
  studentId: any;
  status: string;
  interestedServices: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

const ALL_SERVICES = [
  { slug: 'study-abroad', label: 'Study Abroad' },
  { slug: 'ivy-league', label: 'Ivy League' },
  { slug: 'education-planning', label: 'Education Planning' },
  { slug: 'coaching-classes', label: 'Coaching Classes' },
];

export default function AdvisoryStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
      if (userData.role !== USER_ROLE.ADVISORY) {
        toast.error('Access denied.');
        router.push('/');
        return;
      }
      setUser(userData);
      fetchData();
    } catch {
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      const [studentRes, transferRes] = await Promise.all([
        advisoryAPI.getStudentDetail(studentId),
        advisoryAPI.getTransfers(),
      ]);
      setStudent(studentRes.data.data?.student || null);
      setRegistrations(studentRes.data.data?.registrations || []);

      // Filter transfers for this student
      const allTransfers = transferRes.data.data?.transfers || [];
      const studentTransfers = allTransfers.filter(
        (t: any) => (t.studentId?._id || t.studentId) === studentId
      );
      setTransfers(studentTransfers);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast.error('Failed to fetch student details');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (selectedServices.length === 0) {
      toast.error('Select at least one service for transfer');
      return;
    }
    setTransferring(true);
    try {
      await advisoryAPI.initiateTransfer(studentId, { interestedServices: selectedServices });
      toast.success('Transfer request sent successfully!');
      setShowTransferModal(false);
      setSelectedServices([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate transfer');
    } finally {
      setTransferring(false);
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    setCancelling(true);
    try {
      await advisoryAPI.cancelTransfer(transferId);
      toast.success('Transfer request cancelled');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel transfer');
    } finally {
      setCancelling(false);
    }
  };

  const toggleService = (slug: string) => {
    setSelectedServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
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

  const getTransferStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewFormData = (registrationId: string, serviceName?: string) => {
    // For Ivy League, open the student ivy-league view in read-only mode
    if (serviceName === 'Ivy League Preparation' && student?.userId?._id) {
      router.push(`/ivy-league/student?studentId=${student.userId._id}&readOnly=true`);
      return;
    }
    router.push(`/advisory/students/${studentId}/registration/${registrationId}`);
  };

  const pendingTransfer = transfers.find((t) => t.status === 'PENDING');
  const canTransfer = !student?.adminId?._id && !pendingTransfer;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <AdvisoryLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
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
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${student.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {student.userId.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">Student Details</p>
                </div>
                <div className="flex items-center gap-3">
                  {canTransfer && (
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                    >
                      Transfer Student
                    </button>
                  )}
                  {student.adminId?._id && (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                      Transferred to Admin
                    </span>
                  )}
                </div>
              </div>

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
                      <h2 className="text-2xl font-bold text-gray-900">{getFullName(student.userId)}</h2>
                      <p className="text-gray-600">{student.userId.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${student.userId.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {student.userId.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${student.userId.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Mobile Number</p>
                    <p className="font-medium text-gray-900">
                      {student.userId.mobileNumber || student.mobileNumber || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Joined Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(student.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Transfer Status</p>
                    <p className="font-medium text-gray-900">
                      {student.adminId?._id ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Transferred</span>
                      ) : pendingTransfer ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending Transfer</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Under Advisory</span>
                      )}
                    </p>
                  </div>
                  {(student.intake || student.year) && (
                    <div>
                      {student.intake && (
                        <div className="mb-2">
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
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer History */}
              {transfers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Transfer History</h2>
                  <div className="space-y-3">
                    {transfers.map((transfer) => (
                      <div key={transfer._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getTransferStatusBadge(transfer.status)}`}>
                              {transfer.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(transfer.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Services: {transfer.interestedServices.map((s) => {
                              const service = ALL_SERVICES.find((svc) => svc.slug === s);
                              return service?.label || s;
                            }).join(', ')}
                          </p>
                          {transfer.status === 'REJECTED' && transfer.rejectionReason && (
                            <p className="text-sm text-red-600 mt-1">
                              Reason: {transfer.rejectionReason}
                            </p>
                          )}
                        </div>
                        {transfer.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelTransfer(transfer._id)}
                            disabled={cancelling}
                            className="ml-4 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {cancelling ? 'Cancelling...' : 'Cancel Transfer'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                              {registration.planTier && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                  {registration.planTier}
                                </span>
                              )}
                            </h3>
                            {registration.serviceId.shortDescription && (
                              <p className="text-sm text-gray-600 mb-2">
                                {registration.serviceId.shortDescription}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Registered: {new Date(registration.createdAt).toLocaleDateString('en-GB')}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getRegistrationStatusBadge(registration.status)}`}>
                                {registration.status}
                              </span>
                            </div>
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

              {/* Quick Actions */}
              {student && student.userId?._id && (
                <div className="mt-6 flex gap-3 flex-wrap">
                  <button
                    onClick={() => router.push(`/service-plans/view?studentId=${studentId}`)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Service Plans
                  </button>
                  <button
                    onClick={() => router.push(`/advisory/students/${studentId}/enquiries`)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Student Service Enquiry
                  </button>
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
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Student not found</p>
            </div>
          )}
        </div>
      </AdvisoryLayout>
      {showProfileModal && (
        <StudentProfileModal studentId={studentId} onClose={() => setShowProfileModal(false)} viewerRole="ADVISORY" />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Transfer Student</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select the services the student is interested in. The transfer will be sent to the main admin for approval.
            </p>
            <div className="space-y-3 mb-6">
              {ALL_SERVICES.map((service) => (
                <label key={service.slug} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.slug)}
                    onChange={() => toggleService(service.slug)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{service.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowTransferModal(false); setSelectedServices([]); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring || selectedServices.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {transferring ? 'Sending...' : 'Send Transfer Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
