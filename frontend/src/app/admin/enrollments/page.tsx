'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { enrollmentAPI, serviceAPI } from '@/lib/formApi';
import { Enrollment, EnrollmentStatus, Service } from '@/types/form';
import AdminLayout from '@/components/AdminLayout';

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [counselorId, setCounselorId] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    fetchServices();
    fetchEnrollments();
  }, [statusFilter, serviceFilter]);

  const fetchServices = async () => {
    try {
      const response = await serviceAPI.getAll({ isActive: 'true' });
      setServices(response.data.data.services);
    } catch (error: any) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (serviceFilter) params.serviceId = serviceFilter;

      const response = await enrollmentAPI.getAll(params);
      setEnrollments(response.data.data.enrollments);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (enrollmentId: string, newStatus: EnrollmentStatus) => {
    try {
      await enrollmentAPI.updateStatus(enrollmentId, newStatus);
      toast.success('Enrollment status updated');
      fetchEnrollments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAssignCounselor = async () => {
    if (!selectedEnrollment || !counselorId) {
      toast.error('Please enter a counselor ID');
      return;
    }

    try {
      await enrollmentAPI.assignCounselor(selectedEnrollment._id, counselorId);
      toast.success('Counselor assigned successfully');
      setShowAssignModal(false);
      setSelectedEnrollment(null);
      setCounselorId('');
      fetchEnrollments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign counselor');
    }
  };

  const getStatusColor = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.NOT_STARTED:
        return 'bg-gray-100 text-gray-800';
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

  const openAssignModal = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowAssignModal(true);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Back to Admin Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Enrollment Management</h1>
          <p className="text-gray-600">Manage student enrollments and assign counselors</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Services</option>
              {services.map((service) => (
                <option key={service._id} value={service._id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Enrollments Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading enrollments...</p>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No enrollments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Service</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Counselor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollments.map((enrollment) => {
                    const service = typeof enrollment.service === 'object' ? enrollment.service : null;
                    return (
                      <tr key={enrollment._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-900">
                          Student #{enrollment.student}
                        </td>
                        <td className="px-6 py-4 text-gray-900">
                          {service?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(enrollment.status)}`}>
                            {enrollment.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {enrollment.assignedCounselor ? (
                            <span className="text-green-600">✓ Assigned</span>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {enrollment.createdAt
                            ? new Date(enrollment.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {enrollment.status === EnrollmentStatus.SUBMITTED && (
                              <button
                                onClick={() => handleUpdateStatus(enrollment._id, EnrollmentStatus.COMPLETED)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                              >
                                Mark Complete
                              </button>
                            )}
                            <button
                              onClick={() => openAssignModal(enrollment)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                            >
                              Assign Counselor
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl font-bold text-gray-900">
              {enrollments.length}
            </div>
            <div className="text-sm text-gray-600">Total Enrollments</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl font-bold text-blue-600">
              {enrollments.filter(e => e.status === EnrollmentStatus.IN_PROGRESS).length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl font-bold text-purple-600">
              {enrollments.filter(e => e.status === EnrollmentStatus.SUBMITTED).length}
            </div>
            <div className="text-sm text-gray-600">Submitted</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl font-bold text-green-600">
              {enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>

      {/* Assign Counselor Modal */}
      {showAssignModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Assign Counselor</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Assign a counselor to this enrollment
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Counselor ID *
                </label>
                <input
                  type="text"
                  value={counselorId}
                  onChange={(e) => setCounselorId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
                  placeholder="Enter counselor ID"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Note: You need to get the counselor's ID from the database or user management
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedEnrollment(null);
                    setCounselorId('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCounselor}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-lg hover:from-orange-700 hover:to-yellow-700 font-medium shadow-lg"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

