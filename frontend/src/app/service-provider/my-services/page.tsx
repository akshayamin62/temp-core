'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, spServiceAPI } from '@/lib/api';
import { User, USER_ROLE, SPServiceListing } from '@/types';
import ServiceProviderLayout from '@/components/ServiceProviderLayout';
import toast, { Toaster } from 'react-hot-toast';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function SPMyServicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<SPServiceListing[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<SPServiceListing | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    priceType: 'Contact for Price' as string,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      if (userData.role !== USER_ROLE.SERVICE_PROVIDER) {
        router.push('/dashboard');
        return;
      }
      setUser(userData);
      setServicesOffered(response.data.data.serviceProvider?.servicesOffered || []);

      const servicesRes = await spServiceAPI.getMyServices();
      setServices(servicesRes.data.data.services || []);
    } catch (error: any) {
      toast.error('Please login to continue');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: formData.price ? Number(formData.price) : undefined,
        priceType: formData.priceType,
      };

      if (editingService) {
        await spServiceAPI.updateService(editingService._id, payload);
        if (thumbnailFile) {
          await spServiceAPI.uploadThumbnail(editingService._id, thumbnailFile);
        }
        toast.success('Service updated successfully');
      } else {
        const createRes = await spServiceAPI.createService(payload);
        const newServiceId = createRes.data.data.service._id;
        if (thumbnailFile) {
          await spServiceAPI.uploadThumbnail(newServiceId, thumbnailFile);
        }
        toast.success('Service created successfully');
      }

      resetForm();
      const res = await spServiceAPI.getMyServices();
      setServices(res.data.data.services || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save service');
    }
  };

  const handleToggleActive = async (service: SPServiceListing) => {
    try {
      await spServiceAPI.updateService(service._id, { isActive: !service.isActive });
      setServices(services.map(s => s._id === service._id ? { ...s, isActive: !s.isActive } : s));
      toast.success(service.isActive ? 'Service deactivated' : 'Service activated');
    } catch (error: any) {
      toast.error('Failed to update service');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', category: '', price: '', priceType: 'Contact for Price' });
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditingService(null);
    setShowForm(false);
  };

  const startEdit = (service: SPServiceListing) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price?.toString() || '',
      priceType: service.priceType,
    });
    setThumbnailFile(null);
    setThumbnailPreview(service.thumbnail ? `${BACKEND_URL}/${service.thumbnail.replace(/^\//, '')}` : null);
    setShowForm(true);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ServiceProviderLayout user={user}>
      <Toaster position="top-right" />
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
            <p className="text-gray-500 mt-1">Manage your service listings</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </button>
        </div>

        {/* Add/Edit Service Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g. IELTS Coaching - Band 7+"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select from your Services Offered</option>
                    {servicesOffered.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {servicesOffered.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Please update your Services Offered in Profile first.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
                  placeholder="Describe your service in detail..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price Type</label>
                  <select
                    value={formData.priceType}
                    onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="Contact for Price">Contact for Price</option>
                    <option value="Fixed">Fixed Price</option>
                    <option value="Starting From">Starting From</option>
                  </select>
                </div>
                {formData.priceType !== 'Contact for Price' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Enter amount"
                    />
                  </div>
                )}
              </div>
              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Thumbnail Image</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  {thumbnailPreview ? (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-300">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-500 mt-1">Upload</span>
                    </div>
                  )}
                  {thumbnailPreview && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Change Image
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Max 5MB. JPG, PNG, or WebP recommended.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Service Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No services listed yet</h3>
                <p className="text-gray-500 mb-4">Create your first service listing to start receiving enquiries from students.</p>
                <button
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add Your First Service
                </button>
              </div>
            ) : (
              services.map((service) => (
                <div key={service._id} className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${service.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}>
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{service.title}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            {service.category}
                          </span>
                          {!service.isActive && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {service.priceType === 'Contact for Price'
                            ? 'Contact for Price'
                            : `${service.priceType}: ₹${service.price?.toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggleActive(service)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            service.isActive
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {service.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => startEdit(service)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
      </div>
    </ServiceProviderLayout>
  );
}
