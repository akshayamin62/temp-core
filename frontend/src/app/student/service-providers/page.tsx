'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPServiceListing, SPEnquiryItem } from '@/types';
import StudentLayout from '@/components/StudentLayout';
import toast, { Toaster } from 'react-hot-toast';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

const statusColors: Record<string, { bg: string; text: string }> = {
  New: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Closed: { bg: 'bg-gray-100', text: 'text-gray-600' },
  Converted: { bg: 'bg-green-100', text: 'text-green-700' },
};

export default function StudentServiceProvidersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<SPServiceListing[]>([]);
  const [myEnquiries, setMyEnquiries] = useState<SPEnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-services'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [enquiryModal, setEnquiryModal] = useState<SPServiceListing | null>(null);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [sendingEnquiry, setSendingEnquiry] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await authAPI.getProfile();
      const userData = profileRes.data.data.user;
      if (userData.role !== USER_ROLE.STUDENT) {
        router.push('/dashboard');
        return;
      }
      setUser(userData);

      const [servicesRes, enquiriesRes] = await Promise.all([
        spServiceAPI.browseServices(),
        spServiceAPI.getStudentEnquiries(),
      ]);
      setServices(servicesRes.data.data.services || []);
      setMyEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch (error: any) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEnquiry = async () => {
    if (!enquiryModal || !enquiryMessage.trim()) return;
    setSendingEnquiry(true);
    try {
      const sp = typeof enquiryModal.serviceProviderId === 'object' ? enquiryModal.serviceProviderId._id : enquiryModal.serviceProviderId;
      await spServiceAPI.sendEnquiry({
        spServiceId: enquiryModal._id,
        serviceProviderId: sp,
        message: enquiryMessage.trim(),
      });
      toast.success('Enquiry sent successfully!');
      setEnquiryModal(null);
      setEnquiryMessage('');
      // Refresh own enquiries list
      const enquiriesRes = await spServiceAPI.getStudentEnquiries();
      setMyEnquiries(enquiriesRes.data.data.enquiries || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send enquiry');
    } finally {
      setSendingEnquiry(false);
    }
  };

  // Set of serviceIds the student has already enquired about
  const enquiredServiceIds = new Set(
    myEnquiries.map((e) =>
      typeof e.spServiceId === 'object' ? e.spServiceId._id : e.spServiceId
    )
  );

  // Get unique categories and cities from loaded services
  const categories = ['All', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];
  const cities = ['All', ...Array.from(new Set(
    services
      .map(s => typeof s.serviceProviderId === 'object' ? s.serviceProviderId.city : null)
      .filter((c): c is string => !!c)
  ))];

  // Filter services
  const filteredServices = services.filter((service) => {
    const sp = typeof service.serviceProviderId === 'object' ? service.serviceProviderId : null;
    const matchesCategory = categoryFilter === 'All' || service.category === categoryFilter;
    const matchesCity = cityFilter === 'All' || sp?.city === cityFilter;
    const matchesSearch = !searchQuery ||
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sp?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesCity && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <StudentLayout
      formStructure={[]}
      currentPartIndex={0}
      currentSectionIndex={0}
      onPartChange={() => {}}
      onSectionChange={() => {}}
      isOuterNav={true}
      serviceName="Study Abroad"
      user={user}
    >
      <Toaster position="top-right" />
      <div className="bg-gray-50 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Service Providers</h1>
            <p className="text-gray-500 mt-1">Browse services and send enquiries to service providers</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'browse'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Browse Services
            </button>
            <button
              onClick={() => setActiveTab('my-services')}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'my-services'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Enquiries
              {myEnquiries.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'my-services' ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {myEnquiries.length}
                </span>
              )}
            </button>
          </div>

          {/* â”€â”€ Browse Services Tab â”€â”€ */}
          {activeTab === 'browse' && (
            <>
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                    <span className="text-3xl font-extrabold text-gray-900">{filteredServices.length}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mt-3">Filtered Results</p>
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
                      className="w-full md:w-52 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                      className="w-full md:w-44 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      {cities.map(city => (
                        <option key={city} value={city}>{city === 'All' ? 'All Cities' : city}</option>
                      ))}
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
                    const alreadyEnquired = enquiredServiceIds.has(service._id);
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
                          <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                            {service.category}
                          </span>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">{service.description}</p>

                          {/* Price */}
                          <div className="mb-4">
                            <p className="text-lg font-bold text-gray-900">
                              {service.priceType === 'Contact for Price'
                                ? 'Contact for Price'
                                : `${service.priceType}: ₹${service.price?.toLocaleString()}`}
                            </p>
                          </div>

                          {/* Send Enquiry / Already Sent */}
                          {alreadyEnquired ? (
                            <div className="w-full py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 cursor-default">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Enquiry Sent
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEnquiryModal(service); setEnquiryMessage(''); }}
                              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send Enquiry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* â”€â”€ My Enquiries Tab â”€â”€ */}
          {activeTab === 'my-services' && (
            <>
              {myEnquiries.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No enquiries yet</h3>
                  <p className="text-gray-500 mb-4">Browse services and send an enquiry to get started.</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {myEnquiries.map((enquiry) => {
                    const svc = typeof enquiry.spServiceId === 'object' ? enquiry.spServiceId : null;
                    const sp = typeof enquiry.serviceProviderId === 'object' ? enquiry.serviceProviderId : null;
                    const statusColor = statusColors[enquiry.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                    return (
                      <div key={enquiry._id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                        {svc?.thumbnail && (
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
                          <h3 className="text-lg font-bold text-gray-900 mb-2">{svc?.title || 'Service'}</h3>
                          {svc?.category && (
                            <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-3">
                              {svc.category}
                            </span>
                          )}
                          {svc?.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{svc.description}</p>
                          )}

                          {/* Price */}
                          {svc?.priceType && (
                            <div className="mb-3">
                              <p className="text-lg font-bold text-gray-900">
                                {svc.priceType === 'Contact for Price'
                                  ? 'Contact for Price'
                                  : `${svc.priceType}: ₹${svc.price?.toLocaleString()}`}
                              </p>
                            </div>
                          )}

                          {/* My message */}
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4">
                            <p className="text-xs text-gray-400 font-medium mb-1">Your message</p>
                            <p className="text-sm text-gray-600 italic line-clamp-3">"{enquiry.message}"</p>
                          </div>

                          {/* Status + date */}
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
            </>
          )}
        </div>
      </div>

      {/* Enquiry Modal */}
      {enquiryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Send Enquiry</h3>
              <button
                onClick={() => setEnquiryModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-1">Service: <strong>{enquiryModal.title}</strong></p>
            <p className="text-sm text-gray-600 mb-4">
              Provider: <strong>
                {typeof enquiryModal.serviceProviderId === 'object'
                  ? enquiryModal.serviceProviderId.companyName
                  : 'Service Provider'}
              </strong>
            </p>
            <textarea
              rows={4}
              value={enquiryMessage}
              onChange={(e) => setEnquiryMessage(e.target.value)}
              placeholder="Write your message or questions about this service..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSendEnquiry}
                disabled={sendingEnquiry || !enquiryMessage.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors"
              >
                {sendingEnquiry ? 'Sending...' : 'Send Enquiry'}
              </button>
              <button
                onClick={() => setEnquiryModal(null)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
