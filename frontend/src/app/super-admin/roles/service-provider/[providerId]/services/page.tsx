'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPServiceListing } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function SPServicesPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params?.providerId as string;

  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<SPServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await authAPI.getProfile();
      const userData = profileRes.data.data.user;
      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        router.push('/dashboard');
        return;
      }
      setUser(userData);

      const servicesRes = await spServiceAPI.getSPServicesById(providerId);
      setServices(servicesRes.data.data.services || []);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((svc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      svc.title?.toLowerCase().includes(q) ||
      svc.description?.toLowerCase().includes(q) ||
      svc.category?.toLowerCase().includes(q)
    );
  });

  const activeCount = services.filter(s => s.isActive).length;
  const categories = [...new Set(services.map(s => s.category))];

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
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gray-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Provider&apos;s Services</h1>
              <p className="text-gray-500 mt-1">All services offered by this provider</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{services.length}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Total Services</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{activeCount}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Active</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">{categories.length}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Categories</p>
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
                placeholder="Search by service name, description, or category..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Service Cards */}
          {filteredServices.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-500">{searchQuery ? 'Try adjusting your search criteria.' : 'This provider has not created any services yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServices.map((svc) => (
                <div key={svc._id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                  {svc.thumbnail && (
                    <div className="h-40 w-full overflow-hidden bg-gray-100">
                      <img
                        src={`${BACKEND_URL}/${svc.thumbnail.replace(/^\//, '')}`}
                        alt={svc.title || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">{svc.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${svc.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {svc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {svc.category && (
                      <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                        {svc.category}
                      </span>
                    )}

                    {svc.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{svc.description}</p>
                    )}

                    {/* Price */}
                    <div className="mb-4">
                      <p className="text-lg font-bold text-gray-900">
                        {svc.priceType === 'Contact for Price'
                          ? 'Contact for Price'
                          : `${svc.priceType}: ₹${svc.price?.toLocaleString()}`}
                      </p>
                    </div>

                    {/* Date */}
                    {svc.createdAt && (
                      <div className="flex items-center text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Created {new Date(svc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
