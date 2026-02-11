'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { editRequestAPI } from '@/lib/formApi';
import { EditRequest, EditRequestStatus } from '@/types/form';
import AdminLayout from '@/components/AdminLayout';


export default function EditRequestsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-requests' | 'pending' | 'all'>('my-requests');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      if (user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'COUNSELOR') {
        setActiveTab('pending');
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
  }, [currentUser, activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let response;

      if (activeTab === 'my-requests') {
        response = await editRequestAPI.getMyRequests();
      } else if (activeTab === 'pending') {
        response = await editRequestAPI.getPending();
      } else {
        response = await editRequestAPI.getAll();
      }

      setRequests(response.data.data.editRequests);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch edit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await editRequestAPI.approve(requestId);
      toast.success('Edit request approved');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await editRequestAPI.reject(selectedRequest._id, rejectionReason);
      toast.success('Edit request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const openRejectModal = (request: EditRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const getStatusColor = (status: EditRequestStatus) => {
    switch (status) {
      case EditRequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case EditRequestStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case EditRequestStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  const isCounselor = currentUser?.role?.toUpperCase() === 'COUNSELOR';
  const isStudent = currentUser?.role?.toUpperCase() === 'STUDENT';
  
  const content = (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Requests</h1>
          <p className="text-gray-600">Manage post-submission edit requests</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {isStudent && (
              <button
                onClick={() => setActiveTab('my-requests')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'my-requests'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                My Requests
              </button>
            )}
            {(isAdmin || isCounselor) && (
              <>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Pending Approvals
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                      activeTab === 'all'
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All Requests
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading edit requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">No edit requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => {
                const service = typeof request.service === 'object' ? request.service : null;
                const section = typeof request.section === 'object' ? request.section : null;
                const question = typeof request.question === 'object' ? request.question : null;

                return (
                  <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {question?.label || 'Question'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Service: <span className="font-medium">{service?.name || 'N/A'}</span> • 
                          Section: <span className="font-medium">{section?.title || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Current Value:</p>
                          <p className="text-gray-900">{String(request.currentValue) || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Requested Value:</p>
                          <p className="text-gray-900 font-semibold">{String(request.requestedValue)}</p>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                          <p className="text-gray-900">{request.reason}</p>
                        </div>
                      )}
                      {request.rejectionReason && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</p>
                          <p className="text-red-900">{request.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        Requested: {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'N/A'}
                      </span>
                      {request.status === EditRequestStatus.PENDING && (isAdmin || isCounselor) && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request._id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(request)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Reject Edit Request</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this edit request
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                rows={4}
                placeholder="Enter rejection reason..."
              />

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 font-medium shadow-lg"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );

  // Wrap with AdminLayout only for admins
  return isAdmin ? <AdminLayout user={currentUser}>{content}</AdminLayout> : content;
}

