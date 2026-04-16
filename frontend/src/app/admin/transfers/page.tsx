'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminTransferAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';

interface Transfer {
  _id: string;
  studentId: {
    _id: string;
    userId: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
    };
  };
  fromAdvisorId: {
    companyName: string;
    email: string;
  };
  interestedServices: string[];
  status: string;
  requestedBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  rejectionReason?: string;
}

const SERVICE_LABELS: Record<string, string> = {
  'study-abroad': 'Study Abroad',
  'ivy-league': 'Ivy League',
  'education-planning': 'Education Planning',
  'coaching-classes': 'Coaching Classes',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function AdminTransfersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; transferId: string }>({ open: false, transferId: '' });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchTransfers();
  }, [user, filter]);

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
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = filter === 'pending'
        ? await adminTransferAPI.getPendingTransfers()
        : await adminTransferAPI.getTransfers();
      setTransfers(response.data.data?.transfers || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const handleApprove = async (transferId: string) => {
    try {
      await adminTransferAPI.approveTransfer(transferId);
      toast.success('Transfer approved');
      fetchTransfers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve transfer');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await adminTransferAPI.rejectTransfer(rejectModal.transferId, { reason: rejectReason });
      toast.success('Transfer rejected');
      setRejectModal({ open: false, transferId: '' });
      setRejectReason('');
      fetchTransfers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject transfer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Toaster position="top-right" />
      <AdminLayout user={user}>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Student Transfers</h1>
            <p className="text-gray-600 mt-1">Manage incoming student transfer requests from advisors</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Transfers
            </button>
          </div>

          {/* Transfers List */}
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No {filter === 'pending' ? 'pending ' : ''}transfers found</p>
              </div>
            ) : (
              transfers.map((transfer) => (
                <div key={transfer._id} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {transfer.studentId?.userId?.firstName} {transfer.studentId?.userId?.middleName ? transfer.studentId.userId.middleName + ' ' : ''}{transfer.studentId?.userId?.lastName}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[transfer.status] || 'bg-gray-100'}`}>
                          {transfer.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{transfer.studentId?.userId?.email}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        From: <span className="font-medium">{transfer.fromAdvisorId?.companyName}</span>
                      </p>
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 mb-1">Interested Services:</p>
                        <div className="flex flex-wrap gap-1">
                          {transfer.interestedServices?.map((service) => (
                            <span key={service} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                              {SERVICE_LABELS[service] || service}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Requested {new Date(transfer.createdAt).toLocaleDateString()}
                      </p>
                      {transfer.rejectionReason && (
                        <p className="text-sm text-red-600 mt-2">Reason: {transfer.rejectionReason}</p>
                      )}
                    </div>
                    {transfer.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(transfer._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModal({ open: true, transferId: transfer._id })}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reject Modal */}
          {rejectModal.open && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Reject Transfer</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => { setRejectModal({ open: false, transferId: '' }); setRejectReason(''); }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
