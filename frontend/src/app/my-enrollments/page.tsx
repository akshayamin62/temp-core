'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { enrollmentAPI } from '@/lib/formApi';
import { Enrollment, EnrollmentStatus } from '@/types/form';

export default function MyEnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await enrollmentAPI.getMyEnrollments();
      // Filter out enrollments that have not been started (NOT_STARTED with no actual form progress)
      const filledEnrollments = response.data.data.enrollments.filter(
        (e: Enrollment) => e.status !== EnrollmentStatus.NOT_STARTED
      );
      setEnrollments(filledEnrollments);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case EnrollmentStatus.SUBMITTED:
        return 'bg-purple-100 text-purple-800';
      case EnrollmentStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.IN_PROGRESS:
        return '✏️';
      case EnrollmentStatus.SUBMITTED:
        return '📤';
      case EnrollmentStatus.COMPLETED:
        return '✅';
      default:
        return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Enrollments</h1>
          <p className="text-gray-600">Track your service enrollments and progress</p>
        </div>

        {/* Enrollments List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading enrollments...</p>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Enrollments Yet</h2>
            <p className="text-gray-600 mb-6">Start by enrolling in a service from the home page</p>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => {
              const service = typeof enrollment.service === 'object' ? enrollment.service : null;
              const isPartiallyFilled = enrollment.status === EnrollmentStatus.IN_PROGRESS;
              const isCompleted = enrollment.status === EnrollmentStatus.COMPLETED;

              return (
                <div
                  key={enrollment._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
                    <div className="flex items-start justify-between">
                      <h3 className="text-2xl font-bold">{service?.name || 'Service'}</h3>
                      <span className="text-3xl">{getStatusIcon(enrollment.status)}</span>
                    </div>
                    <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(enrollment.status)}`}>
                      {enrollment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Enrolled:</span>
                        {enrollment.createdAt
                          ? new Date(enrollment.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </div>
                      {enrollment.submittedAt && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Submitted:</span>
                          {new Date(enrollment.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      {isPartiallyFilled ? (
                        <>
                          <button
                            onClick={() => router.push(`/form/${enrollment._id}`)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-semibold transition-all shadow-md"
                          >
                            Complete Form
                          </button>
                          <button
                            onClick={() => router.push(`/form/${enrollment._id}`)}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all"
                          >
                            View Details
                          </button>
                        </>
                      ) : isCompleted ? (
                        <>
                          <button
                            onClick={() => router.push(`/form/${enrollment._id}`)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold transition-all shadow-md"
                          >
                            View Form Details
                          </button>
                          <button
                            onClick={() => router.push(`/service-content/${service?._id}`)}
                            className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-all"
                          >
                            View Service Content
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => router.push(`/form/${enrollment._id}`)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold transition-all shadow-md"
                        >
                          View Details
                        </button>
                      )}

                      <button
                        onClick={() => router.push('/edit-requests')}
                        className="w-full px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 font-medium transition-all"
                      >
                        Request Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
