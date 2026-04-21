'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminAPI, leadAPI } from '@/lib/api';
import { User, USER_ROLE } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import toast, { Toaster } from 'react-hot-toast';
import { getFullName, getInitials } from '@/utils/nameHelpers';
import AuthImage from '@/components/AuthImage';

interface ReferrerData {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    isActive: boolean;
  };
  email: string;
  mobileNumber?: string;
  referralSlug: string;
  leadCount: number;
  createdAt: string;
}

export default function ReferrersListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [referrers, setReferrers] = useState<ReferrerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'deactivated'>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [referrerRegUrl, setReferrerRegUrl] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.ADMIN) {
        toast.error('Access denied. Admin only.');
        router.push('/');
        return;
      }

      setUser(userData);
      fetchReferrers();
      fetchReferrerRegUrl();
    } catch (error) {
      toast.error('Please login to continue');
      router.push('/login');
    }
  };

  const fetchReferrers = async () => {
    try {
      const response = await adminAPI.getReferrers();
      setReferrers(response.data.data.referrers);
    } catch (error: any) {
      toast.error('Failed to fetch referrers');
      console.error('Fetch referrers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mobileNumber.trim()) {
      toast.error('Mobile number is required');
      return;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(formData.mobileNumber.trim())) {
      toast.error('Invalid phone number format');
      return;
    }

    setSubmitting(true);

    try {
      await adminAPI.createReferrer(formData);
      toast.success('Referrer created successfully!');
      setShowModal(false);
      setFormData({ firstName: '', middleName: '', lastName: '', email: '', mobileNumber: '' });
      fetchReferrers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create referrer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReferrers = referrers.filter((referrer) => {
    const referrerName = getFullName(referrer.userId).toLowerCase();
    const matchesSearch =
      referrerName.includes(searchQuery.toLowerCase()) ||
      referrer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (referrer.mobileNumber && referrer.mobileNumber.includes(searchQuery)) ||
      referrer.referralSlug.includes(searchQuery.toLowerCase());

    const isActive = referrer.userId?.isActive;
    const isVerified = referrer.userId?.isVerified;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isVerified && isActive) ||
      (statusFilter === 'pending' && !isVerified) ||
      (statusFilter === 'deactivated' && isVerified && !isActive);

    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (referrerId: string, isVerified: boolean, isActive: boolean) => {
    try {
      await adminAPI.toggleReferrerStatus(referrerId);
      if (!isVerified) {
        toast.success('Referrer verified and activated successfully');
      } else {
        toast.success(`Referrer ${isActive ? 'deactivated' : 'activated'} successfully`);
      }
      fetchReferrers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle referrer status');
    }
  };

  const fetchReferrerRegUrl = async () => {
    try {
      const response = await leadAPI.getEnquiryFormUrl();
      const slug = response.data.data.slug;
      if (slug) {
        setReferrerRegUrl(`${window.location.origin}/become-referrer/${slug}`);
      }
    } catch {
      // ignore
    }
  };

  const copyReferralLink = (slug: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/referral/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedSlug(null), 2000);
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
      <AdminLayout user={user}>
        <div className="p-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">My Referrers</h2>
              <p className="text-gray-600 mt-2">
                Manage referrers and their referral links
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Referrer
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div
              onClick={() => setStatusFilter('all')}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Total</p>
            </div>
            <div
              onClick={() => setStatusFilter('active')}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'active' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.userId?.isVerified && r.userId?.isActive).length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Active</p>
            </div>
            <div
              onClick={() => setStatusFilter('pending')}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => !r.userId?.isVerified).length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Pending</p>
            </div>
            <div
              onClick={() => setStatusFilter('deactivated')}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'deactivated' ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-gray-900">{referrers.filter(r => r.userId?.isVerified && !r.userId?.isActive).length}</h3>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Deactivated</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name, email, phone, or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'pending' | 'deactivated')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          {/* Referrer Registration Link */}
          {referrerRegUrl && (
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Referrer Registration Link</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono break-all">{referrerRegUrl}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referrerRegUrl);
                  toast.success('Registration link copied!');
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1.5 shrink-0 ml-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </button>
            </div>
          )}

          {/* Add Referrer Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Add New Referrer</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter first name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={formData.middleName}
                        onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter middle name (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter last name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter referrer email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.mobileNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^[+()\-\s.0-9]*$/.test(value)) {
                          setFormData({ ...formData, mobileNumber: value });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1234567890 or (123) 456-7890"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Creating...' : 'Create Referrer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Referrers Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {referrers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-gray-500 text-lg">No referrers yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Your First Referrer
                </button>
              </div>
            ) : filteredReferrers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-lg">No referrers found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filter</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReferrers.map((referrer) => (
                    <tr key={referrer._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <AuthImage
                            path={referrer.userId.profilePicture}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover mr-3"
                            fallback={
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-purple-600 font-semibold">
                                  {getInitials(referrer.userId)}
                                </span>
                              </div>
                            }
                          />
                          <div className="font-medium text-gray-900">{getFullName(referrer.userId) || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {referrer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {referrer.mobileNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                          {referrer.leadCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            !referrer.userId?.isVerified
                              ? 'bg-amber-100 text-amber-800'
                              : referrer.userId?.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {!referrer.userId?.isVerified ? 'Pending' : referrer.userId?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                        {new Date(referrer.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/referrers/${referrer._id}`)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          >
                            View Detail
                          </button>
                          <button
                            onClick={() => handleToggleStatus(referrer._id, referrer.userId?.isVerified, referrer.userId?.isActive)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              !referrer.userId?.isVerified
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : referrer.userId?.isActive
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {!referrer.userId?.isVerified ? 'Verify & Activate' : referrer.userId?.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {referrers.length > 0 && (
            <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
              <span>
                Showing {filteredReferrers.length} of {referrers.length} referrer{referrers.length !== 1 ? 's' : ''}
              </span>
              {(searchQuery || statusFilter !== 'active') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('active');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
