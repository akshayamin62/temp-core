'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPServiceListing } from '@/types';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import toast, { Toaster } from 'react-hot-toast';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function AllServicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<SPServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

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

      const servicesRes = await spServiceAPI.getAllServicesForSuperAdmin();
      setServices(servicesRes.data.data.services || []);
    } catch {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];
  const cities = ['All', ...Array.from(new Set(
    services
      .map(s => typeof s.serviceProviderId === 'object' ? s.serviceProviderId.city : null)
      .filter((c): c is string => !!c)
  ))];

  const filteredServices = services.filter((service) => {
    const sp = typeof service.serviceProviderId === 'object' ? service.serviceProviderId : null;
    const matchesCategory = categoryFilter === 'All' || service.category === categoryFilter;
    const matchesCity = cityFilter === 'All' || sp?.city === cityFilter;
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? service.isActive : !service.isActive);
    const matchesSearch = !searchQuery ||
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sp?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesCity && matchesStatus && matchesSearch;
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
    <SuperAdminLayout user={user}>
      <Toaster position="top-right" />
      <div className="bg-gray-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Services</h1>
              <p className="text-gray-500 mt-1">Browse all services from all service providers</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
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
                <span className="text-3xl font-extrabold text-gray-900">{services.filter(s => s.isActive).length}</span>
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
                <span className="text-3xl font-extrabold text-gray-900">{new Set(services.map(s => s.category)).size}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Categories</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-3xl font-extrabold text-gray-900">
                  {new Set(services.map(s => typeof s.serviceProviderId === 'object' ? s.serviceProviderId._id : s.serviceProviderId)).size}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">Providers</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by service name, description, or company..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full md:w-40 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  {cities.map(city => (
                    <option key={city} value={city}>{city === 'All' ? 'All Cities' : city}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full md:w-36 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Service Cards */}
          {filteredServices.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredServices.map((service) => {
                const sp = typeof service.serviceProviderId === 'object' ? service.serviceProviderId : null;
                return (
                  <div key={service._id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
                    {service.thumbnail && (
                      <div className="h-40 w-full overflow-hidden bg-gray-100">
                        <img
                          src={`${BACKEND_URL}/${service.thumbnail.replace(/^\//, '')}`}
                          alt={service.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="p-6">
                      {/* Provider info */}
                      {sp && (
                        <div className="flex items-center gap-3 mb-4">
                          {sp.companyLogo ? (
                            <img
                              src={`${BACKEND_URL}/${sp.companyLogo.replace(/^\//, '')}`}
                              alt={sp.companyName || ''}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-sm">{sp.companyName?.charAt(0) || 'S'}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{sp.companyName || 'Service Provider'}</p>
                            {(sp.city || sp.state) && (
                              <p className="text-xs text-gray-500">{[sp.city, sp.state, sp.country].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Company Website */}
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

                      {/* Service info */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {service.category}
                        </span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{service.description}</p>

                      {/* Price */}
                      <div className="mb-2">
                        <p className="text-lg font-bold text-gray-900">
                          {service.priceType === 'Contact for Price'
                            ? 'Contact for Price'
                            : `${service.priceType}: ₹${service.price?.toLocaleString()}`}
                        </p>
                      </div>

                      {/* Created date */}
                      {service.createdAt && (
                        <p className="text-xs text-gray-400">
                          Created: {new Date(service.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
