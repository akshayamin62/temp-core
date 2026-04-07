'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPEnquiryItem } from '@/types';
import ParentLayout from '@/components/ParentLayout';
import toast, { Toaster } from 'react-hot-toast';
import AuthImage from '@/components/AuthImage';

const statusColors: Record<string, { bg: string; text: string }> = {
  New: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Closed: { bg: 'bg-gray-100', text: 'text-gray-600' },
  Converted: { bg: 'bg-green-100', text: 'text-green-700' },
};

export default function StudentEnquiriesPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.studentId as string;

  const [user, setUser] = useState<User | null>(null);
  const [enquiries, setEnquiries] = useState<SPEnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await authAPI.getProfile();
      const userData = profileRes.data.data.user;
      if (userData.role !== USER_ROLE.PARENT) {
        router.push('/');
        return;
      }
      setUser(userData);

      const enquiriesRes = await spServiceAPI.getStudentEnquiriesById(studentId);
      setEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const filteredEnquiries = enquiries.filter((enquiry) => {
    if (!searchQuery) return true;
    const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
    const sp = typeof enquiry.serviceProviderId === 'object' ? enquiry.serviceProviderId : null;
    const q = searchQuery.toLowerCase();
    return (
      svc?.title?.toLowerCase().includes(q) ||
      sp?.companyName?.toLowerCase().includes(q) ||
      enquiry.message?.toLowerCase().includes(q)
    );
  });

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
    <ParentLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gray-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Service Enquiries</h1>
              <p className="text-gray-500 mt-1">All service enquiries sent by your child</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{enquiries.length}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Total Enquiries</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{enquiries.filter(e => e.status === 'New').length}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">New</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{enquiries.filter(e => e.status === 'Contacted').length}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Contacted</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{enquiries.filter(e => e.status === 'Converted').length}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Converted</p>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by service name, company, or message..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Enquiry Cards */}
          {filteredEnquiries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No enquiries found</h3>
              <p className="text-gray-500">{searchQuery ? 'Try adjusting your search criteria.' : 'No service enquiries have been sent yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEnquiries.map((enquiry) => {
                const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
                const sp = typeof enquiry.serviceProviderId === 'object' ? enquiry.serviceProviderId : null;
                const statusColor = statusColors[enquiry.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                return (
                  <div key={enquiry._id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                    {svc?.thumbnail && (
                      <div className="h-40 w-full overflow-hidden bg-gray-100">
                        <AuthImage
                          path={svc.thumbnail}
                          alt={svc.title || ''}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      {sp && (
                        <div className="flex items-center gap-3 mb-4">
                          <AuthImage
                            path={sp.companyLogo}
                            alt={sp.companyName || ''}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                            fallback={
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">{sp.companyName?.charAt(0) || 'S'}</span>
                              </div>
                            }
                          />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{sp.companyName || 'Service Provider'}</p>
                            {(sp.city || sp.state) && (
                              <p className="text-xs text-gray-500">{[sp.city, sp.state, sp.country].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {sp?.website && (
                        <a
                          href={sp.website.startsWith('http') ? sp.website : `https://${sp.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-3"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          {sp.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}

                      <h3 className="text-lg font-bold text-gray-900 mb-2">{svc?.title || 'Service'}</h3>
                      {svc?.category && (
                        <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                          {svc.category}
                        </span>
                      )}
                      {svc?.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{svc.description}</p>
                      )}

                      {svc?.priceType && (
                        <div className="mb-3">
                          <p className="text-lg font-bold text-gray-900">
                            {svc.priceType === 'Contact for Price'
                              ? 'Contact for Price'
                              : `${svc.priceType}: ₹${svc.price?.toLocaleString()}`}
                          </p>
                        </div>
                      )}

                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4">
                        <p className="text-xs text-gray-400 font-medium mb-1">Student&apos;s message</p>
                        <p className="text-sm text-gray-600 italic line-clamp-3">&quot;{enquiry.message}&quot;</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor.bg} ${statusColor.text}`}>
                          {enquiry.status}
                        </span>
                        {enquiry.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(enquiry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}
